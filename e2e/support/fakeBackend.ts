/**
 * Back-end simulado para os testes E2E da CI.
 *
 * Intercepta, no navegador do Playwright:
 *   - a API Express (VITE_API_BASE_URL) — respostas no formato das views do cupqy-server;
 *   - o Supabase Auth (cadastro, login, sessão, logout, recuperação) e o Storage (upload assinado);
 *   - o Checkout Pro do Mercado Pago, substituído por uma página simulada que devolve o
 *     cliente para /pedidos/:id?pagamento=…&payment_id=….
 *
 * O estado fica em memória por teste. Nenhum serviço externo é usado. Os testes reais contra o
 * ambiente de homologação ficam em e2e/hml (npm run e2e:hml).
 */
import type { BrowserContext, Route } from '@playwright/test';

export const E2E_API = 'http://api.e2e.test';
export const E2E_SUPABASE = 'http://supabase.e2e.test';
export const E2E_MP = 'https://mercadopago.e2e.test';

type Role = 'CUSTOMER' | 'BAKER' | 'ADMIN';
type Status =
  | 'AWAITING_PAYMENT'
  | 'IN_PREPARATION'
  | 'AWAITING_COURIER'
  | 'OUT_FOR_DELIVERY'
  | 'AWAITING_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

const LABELS: Record<Status, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  IN_PREPARATION: 'Em preparo',
  AWAITING_COURIER: 'Aguardando entregador',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  AWAITING_PICKUP: 'Pronto para retirada',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};
const FLOWS: Record<'DELIVERY' | 'PICKUP', Status[]> = {
  DELIVERY: [
    'AWAITING_PAYMENT',
    'IN_PREPARATION',
    'AWAITING_COURIER',
    'OUT_FOR_DELIVERY',
    'COMPLETED',
  ],
  PICKUP: ['AWAITING_PAYMENT', 'IN_PREPARATION', 'AWAITING_PICKUP', 'COMPLETED'],
};
const ACTION_LABELS: Record<string, string> = {
  'DELIVERY:AWAITING_COURIER': 'Pronto — chamar entregador',
  'PICKUP:AWAITING_PICKUP': 'Pronto para retirada',
  'DELIVERY:OUT_FOR_DELIVERY': 'Saiu para entrega',
  'DELIVERY:COMPLETED': 'Entregue',
  'PICKUP:COMPLETED': 'Retirado pelo cliente',
};
const PERMISSIONS: Record<Role, string[]> = {
  CUSTOMER: ['profile:manage-own', 'orders:create', 'orders:read-own'],
  BAKER: [
    'profile:manage-own',
    'orders:create',
    'orders:read-own',
    'orders:read-any',
    'kitchen:access',
  ],
  ADMIN: [
    'profile:manage-own',
    'orders:create',
    'orders:read-own',
    'orders:read-any',
    'kitchen:access',
    'catalog:manage',
    'stock:manage',
    'orders:manage',
    'finance:read',
    'users:manage',
  ],
};

interface Account {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

interface Cupcake {
  id: string;
  name: string;
  description: string;
  flavor: string;
  priceCents: number;
  categoryId: string | null;
  tagIds: string[];
  stock: number | null;
  isActive: boolean;
  imagePath: string | null;
  ingredients: string;
  weightGrams: number | null;
  size: string | null;
  nutritionalInfo: Record<string, number> | null;
  createdAt: string;
}

interface Address {
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

interface Order {
  id: string;
  orderNumber: number;
  userId: string;
  status: Status;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  items: Array<{
    id: string;
    cupcakeId: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
  }>;
  feeCents: number;
  notes: string | null;
  address: Address | null;
  courierName: string | null;
  createdAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  cancellationReason: string | null;
  payment: null | { status: 'APPROVED' | 'REJECTED' | 'PENDING'; approvedAt: string | null };
  history: Array<{
    fromStatus: Status | null;
    toStatus: Status;
    createdAt: string;
    note: string | null;
  }>;
}

let counter = 0;
const uuid = () => {
  counter += 1;
  return `e2e00000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
};
const now = () => new Date().toISOString();
const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

function base64url(value: object) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function jwt(account: Account) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({
    sub: account.id,
    email: account.email,
    role: 'authenticated',
    aud: 'authenticated',
    exp,
    session_id: uuid(),
  })}.e2e-signature`;
}

export class FakeBackend {
  accounts: Account[] = [];
  tokens = new Map<string, string>();
  categories = [
    {
      id: uuid(),
      name: 'Clássicos',
      slug: 'classicos',
      description: 'Os sabores tradicionais da casa.',
    },
    { id: uuid(), name: 'Frutados', slug: 'frutados', description: 'Com frutas frescas e caldas.' },
  ];
  tags = [
    { id: uuid(), name: 'Sem Lactose', slug: 'sem-lactose' },
    { id: uuid(), name: 'Vegano', slug: 'vegano' },
  ];
  cupcakes: Cupcake[] = [];
  addresses = new Map<
    string,
    Array<Address & { id: string; label: string | null; isDefault: boolean }>
  >();
  orders: Order[] = [];
  nextOrderNumber = 1001;
  storedFiles = new Set<string>();

  constructor() {
    const [classicos, frutados] = this.categories;
    const [semLactose, vegano] = this.tags;
    const base = {
      isActive: true,
      imagePath: null,
      ingredients: 'Farinha de trigo, ovos, manteiga e açúcar.',
      weightGrams: 80,
      size: 'Médio (7 cm)',
      nutritionalInfo: { servingSizeGrams: 80, calories: 310 },
      createdAt: now(),
    };
    this.cupcakes = [
      {
        ...base,
        id: uuid(),
        name: 'Chocolate Belga',
        description: 'Ganache de chocolate belga.',
        flavor: 'Chocolate',
        priceCents: 990,
        categoryId: classicos!.id,
        tagIds: [],
        stock: 20,
      },
      {
        ...base,
        id: uuid(),
        name: 'Morango Fresco',
        description: 'Creme de morango com fruta fresca.',
        flavor: 'Morango',
        priceCents: 1190,
        categoryId: frutados!.id,
        tagIds: [semLactose!.id],
        stock: 3,
      },
      {
        ...base,
        id: uuid(),
        name: 'Chocolate Vegano',
        description: 'Cacau e ganache de coco.',
        flavor: 'Chocolate',
        priceCents: 1190,
        categoryId: classicos!.id,
        tagIds: [semLactose!.id, vegano!.id],
        stock: 10,
      },
      {
        ...base,
        id: uuid(),
        name: 'Limão Siciliano',
        description: 'Curd de limão e merengue.',
        flavor: 'Limão',
        priceCents: 950,
        categoryId: frutados!.id,
        tagIds: [],
        stock: 0,
      },
    ];
    this.addAccount({
      email: 'cliente@cupqy.test',
      password: 'cupcake2026',
      fullName: 'Clara Cliente',
      role: 'CUSTOMER',
    });
    this.addAccount({
      email: 'confeiteiro@cupqy.test',
      password: 'cupcake2026',
      fullName: 'Bruno Confeiteiro',
      role: 'BAKER',
    });
    this.addAccount({
      email: 'admin@cupqy.test',
      password: 'cupcake2026',
      fullName: 'Ana Admin',
      role: 'ADMIN',
    });
  }

  addAccount(input: Omit<Account, 'id' | 'createdAt' | 'phone'> & { phone?: string | null }) {
    const account: Account = { id: uuid(), createdAt: now(), phone: null, ...input };
    this.accounts.push(account);
    return account;
  }

  cupcakeByName(name: string) {
    return this.cupcakes.find((cupcake) => cupcake.name === name)!;
  }

  /* ----------------------------- Serialização ----------------------------- */

  private category(id: string | null) {
    const category = this.categories.find((item) => item.id === id);
    return category ? { id: category.id, name: category.name, slug: category.slug } : null;
  }

  private summary(cupcake: Cupcake) {
    const available = cupcake.stock ?? 0;
    return {
      id: cupcake.id,
      name: cupcake.name,
      description: cupcake.description,
      flavor: cupcake.flavor,
      priceCents: cupcake.priceCents,
      imageUrl: cupcake.imagePath
        ? `${E2E_SUPABASE}/storage/v1/object/public/cupcake-images/${cupcake.imagePath}`
        : null,
      category: this.category(cupcake.categoryId),
      dietaryTags: this.tags.filter((tag) => cupcake.tagIds.includes(tag.id)),
      stock: { available, soldOut: available <= 0 },
    };
  }

  private detail(cupcake: Cupcake) {
    return {
      ...this.summary(cupcake),
      ingredients: cupcake.ingredients,
      weightGrams: cupcake.weightGrams,
      size: cupcake.size,
      nutritionalInfo: cupcake.nutritionalInfo,
    };
  }

  private admin(cupcake: Cupcake) {
    return {
      ...this.detail(cupcake),
      isActive: cupcake.isActive,
      imagePath: cupcake.imagePath,
      createdAt: cupcake.createdAt,
      updatedAt: now(),
    };
  }

  private profile(account: Account) {
    return {
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      phone: account.phone,
      role: account.role,
      permissions: PERMISSIONS[account.role],
      createdAt: account.createdAt,
      updatedAt: account.createdAt,
    };
  }

  private authUser(account: Account) {
    return {
      id: account.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: account.email,
      email_confirmed_at: account.createdAt,
      phone: '',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: account.fullName },
      identities: [
        {
          id: account.id,
          user_id: account.id,
          provider: 'email',
          identity_data: { email: account.email },
        },
      ],
      created_at: account.createdAt,
      updated_at: account.createdAt,
    };
  }

  private session(account: Account) {
    const accessToken = jwt(account);
    this.tokens.set(accessToken, account.id);
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: `refresh-${account.id}`,
      user: this.authUser(account),
    };
  }

  private orderSummary(order: Order) {
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: LABELS[order.status],
      fulfillmentType: order.fulfillmentType,
      totalCents: subtotal + order.feeCents,
      itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
    };
  }

  private orderDetail(order: Order) {
    const flow = FLOWS[order.fulfillmentType];
    const current = flow.indexOf(order.status);
    const reached = new Map(order.history.map((entry) => [entry.toStatus, entry.createdAt]));
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
    return {
      ...this.orderSummary(order),
      subtotalCents: subtotal,
      deliveryFeeCents: order.feeCents,
      notes: order.notes,
      estimatedMinutes: order.fulfillmentType === 'DELIVERY' ? 45 : 30,
      delivery:
        order.fulfillmentType === 'DELIVERY'
          ? {
              address: order.address,
              distanceKm: 2.2,
              courierName: ['OUT_FOR_DELIVERY', 'COMPLETED'].includes(order.status)
                ? order.courierName
                : null,
            }
          : null,
      pickup:
        order.fulfillmentType === 'PICKUP'
          ? { address: 'Rua Augusta, 1500 - São Paulo - SP' }
          : null,
      items: order.items.map((item) => ({
        ...item,
        subtotalCents: item.unitPriceCents * item.quantity,
      })),
      payment: order.payment
        ? {
            id: 'pay-1',
            provider: 'MERCADO_PAGO',
            status: order.payment.status,
            statusDetail: null,
            method: 'pix',
            type: 'bank_transfer',
            methodLabel: 'Pix',
            amountCents: subtotal + order.feeCents,
            approvedAt: order.payment.approvedAt,
            refundStatus: 'NONE',
          }
        : null,
      paymentExpiresAt:
        order.status === 'AWAITING_PAYMENT'
          ? new Date(Date.now() + 30 * 60_000).toISOString()
          : null,
      cancellationReason: order.cancellationReason,
      progress:
        order.status === 'CANCELLED'
          ? []
          : flow.map((status, index) => ({
              status,
              label: LABELS[status],
              reachedAt: reached.get(status) ?? null,
              done: index <= current,
              current: index === current,
            })),
      statusHistory: order.history.map((entry) => ({ ...entry, label: LABELS[entry.toStatus] })),
      updatedAt: now(),
    };
  }

  private kitchenOrder(order: Order) {
    const flow = FLOWS[order.fulfillmentType];
    const next = flow[flow.indexOf(order.status) + 1];
    const account = this.accounts.find((item) => item.id === order.userId);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: LABELS[order.status],
      fulfillmentType: order.fulfillmentType,
      paidAt: order.paidAt,
      elapsedMinutes: 5,
      items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })),
      totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
      notes: order.notes,
      customer: { name: account?.fullName ?? null, phone: account?.phone ?? null },
      delivery:
        order.fulfillmentType === 'DELIVERY'
          ? { address: order.address, courierName: order.courierName }
          : null,
      nextAction: next
        ? {
            nextStatus: next,
            label: ACTION_LABELS[`${order.fulfillmentType}:${next}`],
            requiresCourierName: next === 'OUT_FOR_DELIVERY',
          }
        : null,
    };
  }

  private evaluate(items: Array<{ cupcakeId: string; quantity: number }>) {
    const lines = items.map(({ cupcakeId, quantity }) => {
      const cupcake = this.cupcakes.find((item) => item.id === cupcakeId);
      if (!cupcake || !cupcake.isActive) {
        return {
          cupcakeId,
          name: cupcake?.name ?? null,
          flavor: null,
          imageUrl: null,
          unitPriceCents: null,
          quantity,
          availableQuantity: 0,
          subtotalCents: 0,
          status: 'UNAVAILABLE',
        };
      }
      const available = cupcake.stock ?? 0;
      const status =
        available <= 0 ? 'SOLD_OUT' : quantity > available ? 'INSUFFICIENT_STOCK' : 'OK';
      return {
        cupcakeId,
        name: cupcake.name,
        flavor: cupcake.flavor,
        imageUrl: this.summary(cupcake).imageUrl,
        unitPriceCents: cupcake.priceCents,
        quantity,
        availableQuantity: Math.min(available, 50),
        subtotalCents: status === 'OK' ? cupcake.priceCents * quantity : 0,
        status,
      };
    });
    const issues = lines
      .filter((line) => line.status !== 'OK')
      .map((line) => ({
        cupcakeId: line.cupcakeId,
        name: line.name,
        status: line.status,
        requestedQuantity: line.quantity,
        availableQuantity: line.availableQuantity,
      }));
    const subtotalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);
    return {
      stockDate: today(),
      items: lines,
      totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotalCents,
      issues,
      canCheckout: issues.length === 0 && subtotalCents > 0,
    };
  }

  private stockOverview() {
    const items = this.cupcakes.map((cupcake) => {
      const quantity = cupcake.stock ?? 0;
      return {
        cupcake: {
          id: cupcake.id,
          name: cupcake.name,
          flavor: cupcake.flavor,
          imageUrl: this.summary(cupcake).imageUrl,
          isActive: cupcake.isActive,
        },
        quantity,
        isSet: cupcake.stock !== null,
        lowStock: cupcake.stock !== null && quantity > 0 && quantity < 5,
        soldOut: cupcake.stock !== null && quantity <= 0,
        updatedAt: null,
      };
    });
    const active = items.filter((item) => item.cupcake.isActive);
    return {
      date: today(),
      lowStockThreshold: 5,
      summary: {
        activeCupcakes: active.length,
        totalUnits: active.reduce((sum, item) => sum + item.quantity, 0),
        lowStock: active.filter((item) => item.lowStock).length,
        soldOut: active.filter((item) => item.soldOut).length,
        notSet: active.filter((item) => !item.isSet).length,
      },
      items,
    };
  }

  /** Avança o status como faria o webhook/cozinha (útil para cenários de acompanhamento). */
  setStatus(order: Order, status: Status, note: string | null = null) {
    order.history.push({ fromStatus: order.status, toStatus: status, createdAt: now(), note });
    order.status = status;
    if (status === 'COMPLETED') order.completedAt = now();
    if (status === 'CANCELLED') order.cancelledAt = now();
  }

  private confirmPayment(order: Order) {
    if (order.status !== 'AWAITING_PAYMENT') return;
    order.paidAt = now();
    order.payment = { status: 'APPROVED', approvedAt: now() };
    for (const item of order.items) {
      const cupcake = this.cupcakes.find((entry) => entry.id === item.cupcakeId);
      if (cupcake && cupcake.stock !== null) cupcake.stock -= item.quantity;
    }
    this.setStatus(order, 'IN_PREPARATION');
  }

  /* ------------------------------- Rotas --------------------------------- */

  async install(context: BrowserContext) {
    await context.route(`${E2E_SUPABASE}/**`, (route) => this.handleSupabase(route));
    await context.route(`${E2E_API}/**`, (route) => this.handleApi(route));
    await context.route(`${E2E_MP}/**`, (route) => this.handleMercadoPago(route));
  }

  private cors(route: Route) {
    const requested = route.request().headers()['access-control-request-headers'];
    return {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers':
        requested ?? 'authorization,content-type,apikey,x-client-info,x-supabase-api-version',
      'access-control-expose-headers': 'x-request-id',
    };
  }

  private json(route: Route, status: number, body?: unknown) {
    return route.fulfill({
      status,
      headers: {
        ...this.cors(route),
        'content-type': 'application/json',
        'x-supabase-api-version': '2024-01-01',
      },
      body: body === undefined ? '' : JSON.stringify(body),
    });
  }

  private apiError(route: Route, status: number, code: string, message: string) {
    return this.json(route, status, { error: { code, message }, requestId: 'e2e' });
  }

  private accountFrom(route: Route) {
    const header = route.request().headers().authorization ?? '';
    const accountId = this.tokens.get(header.replace(/^Bearer /, ''));
    return this.accounts.find((account) => account.id === accountId) ?? null;
  }

  private body<T>(route: Route): T {
    const raw = route.request().postData();
    return (raw ? JSON.parse(raw) : {}) as T;
  }

  private async handleSupabase(route: Route) {
    const request = route.request();
    if (request.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: this.cors(route) });
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/auth/v1/token') {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const { email, password } = this.body<{ email: string; password: string }>(route);
        const account = this.accounts.find(
          (item) => item.email === email && item.password === password,
        );
        if (!account) {
          return this.json(route, 400, {
            code: 'invalid_credentials',
            error_code: 'invalid_credentials',
            msg: 'Invalid login credentials',
            message: 'Invalid login credentials',
          });
        }
        return this.json(route, 200, this.session(account));
      }
      if (grant === 'refresh_token') {
        const { refresh_token: token } = this.body<{ refresh_token: string }>(route);
        const account = this.accounts.find((item) => `refresh-${item.id}` === token);
        if (!account)
          return this.json(route, 400, {
            code: 'refresh_token_not_found',
            msg: 'Invalid Refresh Token',
          });
        return this.json(route, 200, this.session(account));
      }
    }
    if (path === '/auth/v1/signup') {
      const { email, password, data } = this.body<{
        email: string;
        password: string;
        data?: { full_name?: string; phone?: string | null };
      }>(route);
      if (this.accounts.some((item) => item.email === email)) {
        return this.json(route, 422, {
          code: 'user_already_exists',
          error_code: 'user_already_exists',
          msg: 'User already registered',
        });
      }
      const account = this.addAccount({
        email,
        password,
        fullName: data?.full_name ?? '',
        phone: data?.phone ?? null,
        role: 'CUSTOMER',
      });
      return this.json(route, 200, this.session(account));
    }
    if (path === '/auth/v1/user') {
      const account = this.accountFrom(route);
      if (!account) return this.json(route, 401, { code: 'bad_jwt', msg: 'invalid JWT' });
      if (request.method() === 'PUT') {
        const { password } = this.body<{ password?: string }>(route);
        if (password) account.password = password;
      }
      return this.json(route, 200, this.authUser(account));
    }
    if (path === '/auth/v1/logout') {
      const header = request.headers().authorization ?? '';
      this.tokens.delete(header.replace(/^Bearer /, ''));
      return route.fulfill({ status: 204, headers: this.cors(route) });
    }
    if (path === '/auth/v1/recover' || path === '/auth/v1/resend') return this.json(route, 200, {});
    if (path.startsWith('/storage/v1/object/upload/sign/')) {
      this.storedFiles.add(path.replace('/storage/v1/object/upload/sign/cupcake-images/', ''));
      return this.json(route, 200, { Key: path });
    }
    if (path.startsWith('/storage/v1/object/public/')) {
      // Imagem PNG 1×1 rosa.
      return route.fulfill({
        status: 200,
        headers: { ...this.cors(route), 'content-type': 'image/png' },
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/+N/PQAJpQPQjZT9LQAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
    }
    return this.json(route, 404, { msg: 'not mocked' });
  }

  private handleMercadoPago(route: Route) {
    const url = new URL(route.request().url());
    const orderId = url.searchParams.get('order') ?? '';
    const back = `${url.searchParams.get('back')}/pedidos/${orderId}`;
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: `<!doctype html><html lang="pt-BR"><head><title>Mercado Pago (simulado)</title></head>
<body style="font-family:sans-serif;background:#fff;color:#111;padding:40px">
<h1>Mercado Pago — ambiente de testes (simulado)</h1>
<p>Pedido ${orderId}</p>
<a href="${back}?pagamento=sucesso&payment_id=987654321&status=approved">Pagar com Pix (aprovado)</a><br><br>
<a href="${back}?pagamento=pendente&payment_id=987654322&status=pending">Pagamento pendente</a><br><br>
<a href="${back}?pagamento=falha&status=rejected">Pagamento recusado</a>
</body></html>`,
    });
  }

  private async handleApi(route: Route) {
    const request = route.request();
    if (request.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: this.cors(route) });
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = request.method();
    const query = url.searchParams;
    const segments = path.split('/').filter(Boolean);

    /* Catálogo público */
    if (method === 'GET' && path === '/cupcakes') {
      const search = query.get('search')?.toLowerCase();
      const categories = query.get('category')?.split(',');
      const flavors = query.get('flavor')?.split(',');
      const tags = query.get('dietaryTags')?.split(',');
      const includeSoldOut = query.get('includeSoldOut') === 'true';
      let items = this.cupcakes.filter(
        (cupcake) => cupcake.isActive && (includeSoldOut || (cupcake.stock ?? 0) > 0),
      );
      if (search) items = items.filter((cupcake) => cupcake.name.toLowerCase().includes(search));
      if (categories)
        items = items.filter((cupcake) =>
          categories.includes(this.category(cupcake.categoryId)?.slug ?? ''),
        );
      if (flavors) items = items.filter((cupcake) => flavors.includes(cupcake.flavor));
      if (tags)
        items = items.filter((cupcake) =>
          tags.every((slug) =>
            this.tags.some((tag) => tag.slug === slug && cupcake.tagIds.includes(tag.id)),
          ),
        );
      const sort = query.get('sort');
      items = items.toSorted((a, b) =>
        sort === 'price_asc'
          ? a.priceCents - b.priceCents
          : sort === 'price_desc'
            ? b.priceCents - a.priceCents
            : a.name.localeCompare(b.name),
      );
      const pageSize = Number(query.get('pageSize') ?? 20);
      const page = Number(query.get('page') ?? 1);
      return this.json(route, 200, {
        data: items.slice((page - 1) * pageSize, page * pageSize).map((item) => this.summary(item)),
        meta: {
          page,
          pageSize,
          total: items.length,
          totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
        },
      });
    }
    if (method === 'GET' && path === '/cupcakes/flavors') {
      return this.json(route, 200, {
        data: [...new Set(this.cupcakes.map((cupcake) => cupcake.flavor))].sort(),
      });
    }
    if (method === 'GET' && segments[0] === 'cupcakes' && segments.length === 2) {
      const cupcake = this.cupcakes.find((item) => item.id === segments[1] && item.isActive);
      return cupcake
        ? this.json(route, 200, { data: this.detail(cupcake) })
        : this.apiError(route, 404, 'CUPCAKE_NOT_FOUND', 'Cupcake não encontrado.');
    }
    if (method === 'GET' && path === '/categories')
      return this.json(route, 200, { data: this.categories });
    if (method === 'GET' && path === '/dietary-tags')
      return this.json(route, 200, { data: this.tags });
    if (method === 'GET' && path === '/store') {
      return this.json(route, 200, {
        data: {
          name: 'Cupqy',
          address: 'Rua Augusta, 1500 - Consolação, São Paulo - SP',
          timeZone: 'America/Sao_Paulo',
          pickup: { feeCents: 0, estimatedMinutes: 30 },
          delivery: { baseFeeCents: 500, feePerKmCents: 150, maxDistanceKm: 15 },
        },
      });
    }
    if (method === 'POST' && path === '/cart/validate') {
      return this.json(route, 200, {
        data: this.evaluate(
          this.body<{ items: Array<{ cupcakeId: string; quantity: number }> }>(route).items,
        ),
      });
    }
    if (method === 'GET' && segments[0] === 'shipping' && segments[1] === 'cep') {
      const cep = segments[2]?.replace(/\D/g, '');
      if (cep !== '01310100')
        return this.apiError(route, 404, 'CEP_NOT_FOUND', 'CEP não encontrado.');
      return this.json(route, 200, {
        data: {
          zipCode: cep,
          street: 'Avenida Paulista',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        },
      });
    }

    /* Rotas autenticadas */
    const account = this.accountFrom(route);
    if (!account) return this.apiError(route, 401, 'MISSING_TOKEN', 'Token ausente.');
    const isStaff = account.role !== 'CUSTOMER';
    const isAdmin = account.role === 'ADMIN';

    if (path === '/users/me' && method === 'GET')
      return this.json(route, 200, { data: this.profile(account) });
    if (path === '/users/me' && method === 'PATCH') {
      const body = this.body<{ fullName?: string; phone?: string | null }>(route);
      if (body.fullName) account.fullName = body.fullName;
      if (body.phone !== undefined) account.phone = body.phone;
      return this.json(route, 200, { data: this.profile(account) });
    }
    if (path === '/users/me/addresses' && method === 'GET')
      return this.json(route, 200, { data: this.addresses.get(account.id) ?? [] });
    if (path === '/users/me/addresses' && method === 'POST') {
      const list = this.addresses.get(account.id) ?? [];
      const body = this.body<Address & { label?: string | null; isDefault?: boolean }>(route);
      const address = {
        ...body,
        id: uuid(),
        label: body.label ?? null,
        isDefault: list.length === 0 || Boolean(body.isDefault),
        createdAt: now(),
        updatedAt: now(),
      };
      this.addresses.set(account.id, [...list, address]);
      return this.json(route, 201, { data: address });
    }
    if (method === 'POST' && path === '/shipping/quote') {
      const body = this.body<{
        fulfillmentType: 'DELIVERY' | 'PICKUP';
        addressId?: string;
        address?: Address;
      }>(route);
      if (body.fulfillmentType === 'PICKUP') {
        return this.json(route, 200, {
          data: {
            fulfillmentType: 'PICKUP',
            feeCents: 0,
            distanceKm: null,
            estimatedMinutes: 30,
            pickupAddress: 'Rua Augusta, 1500',
            deliveryAddress: null,
          },
        });
      }
      const address =
        body.address ?? this.addresses.get(account.id)?.find((item) => item.id === body.addressId);
      return this.json(route, 200, {
        data: {
          fulfillmentType: 'DELIVERY',
          feeCents: 830,
          distanceKm: 2.2,
          estimatedMinutes: 45,
          pickupAddress: null,
          deliveryAddress: address,
        },
      });
    }

    /* Pedidos do cliente */
    if (method === 'POST' && path === '/orders') {
      const body = this.body<{
        fulfillmentType: 'DELIVERY' | 'PICKUP';
        items: Array<{ cupcakeId: string; quantity: number }>;
        notes?: string | null;
        address?: Address;
        addressId?: string;
      }>(route);
      const evaluation = this.evaluate(body.items);
      if (!evaluation.canCheckout)
        return this.apiError(route, 409, 'CART_UNAVAILABLE', 'Alguns itens estão indisponíveis.');
      const order: Order = {
        id: uuid(),
        orderNumber: this.nextOrderNumber++,
        userId: account.id,
        status: 'AWAITING_PAYMENT',
        fulfillmentType: body.fulfillmentType,
        items: evaluation.items.map((line) => ({
          id: uuid(),
          cupcakeId: line.cupcakeId,
          name: line.name!,
          unitPriceCents: line.unitPriceCents!,
          quantity: line.quantity,
        })),
        feeCents: body.fulfillmentType === 'DELIVERY' ? 830 : 0,
        notes: body.notes ?? null,
        address:
          body.address ??
          this.addresses.get(account.id)?.find((item) => item.id === body.addressId) ??
          null,
        courierName: null,
        createdAt: now(),
        paidAt: null,
        cancelledAt: null,
        completedAt: null,
        cancellationReason: null,
        payment: null,
        history: [{ fromStatus: null, toStatus: 'AWAITING_PAYMENT', createdAt: now(), note: null }],
      };
      this.orders.push(order);
      const origin = request.headers().origin ?? 'http://localhost:4174';
      return this.json(route, 201, {
        data: {
          ...this.orderDetail(order),
          checkout: {
            preferenceId: `pref-${order.id}`,
            checkoutUrl: `${E2E_MP}/checkout?order=${order.id}&back=${encodeURIComponent(origin)}`,
            sandbox: true,
            expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          },
        },
      });
    }
    if (method === 'GET' && path === '/orders') {
      const scope = query.get('scope') ?? 'all';
      const mine = this.orders
        .filter((order) => order.userId === account.id)
        .filter(
          (order) =>
            scope === 'all' ||
            (scope === 'history') === ['COMPLETED', 'CANCELLED'].includes(order.status),
        )
        .toReversed();
      return this.json(route, 200, {
        data: mine.map((order) => this.orderSummary(order)),
        meta: { page: 1, pageSize: 20, total: mine.length, totalPages: 1 },
      });
    }
    if (segments[0] === 'orders' && segments[1]) {
      const order = this.orders.find(
        (item) => item.id === segments[1] && (item.userId === account.id || isStaff),
      );
      if (!order) return this.apiError(route, 404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.');
      const action = segments.slice(2).join('/');
      if (method === 'GET' && !action)
        return this.json(route, 200, { data: this.orderDetail(order) });
      if (method === 'POST' && action === 'payment/sync') {
        // A API consulta o Mercado Pago: aqui, um payment_id informado significa aprovado.
        const { paymentId } = this.body<{ paymentId?: string }>(route);
        if (paymentId === '987654321') this.confirmPayment(order);
        if (paymentId === '987654322' && !order.payment)
          order.payment = { status: 'PENDING', approvedAt: null };
        return this.json(route, 200, { data: this.orderDetail(order) });
      }
      if (method === 'POST' && action === 'cancel') {
        if (order.status !== 'AWAITING_PAYMENT')
          return this.apiError(
            route,
            409,
            'ORDER_NOT_CANCELLABLE',
            'Apenas pedidos aguardando pagamento podem ser cancelados.',
          );
        order.cancellationReason = 'CUSTOMER_REQUEST';
        this.setStatus(order, 'CANCELLED');
        return this.json(route, 200, { data: this.orderDetail(order) });
      }
    }

    /* Cozinha */
    if (path === '/kitchen/orders' && method === 'GET') {
      if (!isStaff) return this.apiError(route, 403, 'FORBIDDEN', 'Sem permissão.');
      const queue = this.orders.filter((order) =>
        ['IN_PREPARATION', 'AWAITING_COURIER', 'OUT_FOR_DELIVERY', 'AWAITING_PICKUP'].includes(
          order.status,
        ),
      );
      const summary = {
        IN_PREPARATION: 0,
        AWAITING_COURIER: 0,
        OUT_FOR_DELIVERY: 0,
        AWAITING_PICKUP: 0,
      } as Record<string, number>;
      for (const order of queue) summary[order.status] = (summary[order.status] ?? 0) + 1;
      const filtered = queue
        .filter((order) => !query.get('status') || order.status === query.get('status'))
        .filter(
          (order) =>
            !query.get('fulfillmentType') || order.fulfillmentType === query.get('fulfillmentType'),
        );
      return this.json(route, 200, {
        data: filtered.map((order) => this.kitchenOrder(order)),
        meta: { summary },
      });
    }
    if (segments[0] === 'kitchen' && segments[3] === 'advance' && method === 'POST') {
      if (!isStaff) return this.apiError(route, 403, 'FORBIDDEN', 'Sem permissão.');
      const order = this.orders.find((item) => item.id === segments[2]);
      if (!order)
        return this.apiError(route, 404, 'ORDER_NOT_IN_KITCHEN', 'Pedido não está na cozinha.');
      const body = this.body<{ expectedStatus?: Status; courierName?: string }>(route);
      if (body.expectedStatus && body.expectedStatus !== order.status)
        return this.apiError(route, 409, 'ORDER_STATUS_CHANGED', 'O status do pedido mudou.');
      const flow = FLOWS[order.fulfillmentType];
      const next = flow[flow.indexOf(order.status) + 1]!;
      if (next === 'OUT_FOR_DELIVERY') order.courierName = body.courierName ?? null;
      this.setStatus(order, next);
      return this.json(route, 200, { data: this.kitchenOrder(order) });
    }

    /* Administração */
    if (segments[0] === 'admin') {
      if (!isAdmin) return this.apiError(route, 403, 'FORBIDDEN', 'Sem permissão.');
      const resource = segments[1];
      if (resource === 'cupcakes' && segments.length === 2) {
        if (method === 'GET') {
          const items = this.cupcakes.filter(
            (cupcake) =>
              !query.get('search') ||
              cupcake.name.toLowerCase().includes(query.get('search')!.toLowerCase()),
          );
          return this.json(route, 200, {
            data: items.map((item) => this.admin(item)),
            meta: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
          });
        }
        if (method === 'POST') {
          const body = this.body<Partial<Cupcake> & { dietaryTagIds?: string[] }>(route);
          const cupcake: Cupcake = {
            id: uuid(),
            name: body.name!,
            description: body.description!,
            flavor: body.flavor!,
            priceCents: body.priceCents!,
            categoryId: body.categoryId ?? null,
            tagIds: body.dietaryTagIds ?? [],
            stock: null,
            isActive: body.isActive ?? true,
            imagePath: null,
            ingredients: body.ingredients!,
            weightGrams: body.weightGrams ?? null,
            size: body.size ?? null,
            nutritionalInfo: body.nutritionalInfo ?? null,
            createdAt: now(),
          };
          this.cupcakes.push(cupcake);
          return this.json(route, 201, { data: this.admin(cupcake) });
        }
      }
      if (resource === 'cupcakes' && segments[2]) {
        const cupcake = this.cupcakes.find((item) => item.id === segments[2]);
        if (!cupcake)
          return this.apiError(route, 404, 'CUPCAKE_NOT_FOUND', 'Cupcake não encontrado.');
        const action = segments.slice(3).join('/');
        if (!action && method === 'GET')
          return this.json(route, 200, { data: this.admin(cupcake) });
        if (!action && method === 'PATCH') {
          const body = this.body<Partial<Cupcake> & { dietaryTagIds?: string[] }>(route);
          Object.assign(cupcake, { ...body, tagIds: body.dietaryTagIds ?? cupcake.tagIds });
          return this.json(route, 200, { data: this.admin(cupcake) });
        }
        if (action === 'image/upload-url' && method === 'POST') {
          const { contentType } = this.body<{ contentType: string }>(route);
          const objectPath = `cupcakes/${cupcake.id}/${uuid()}.${contentType.split('/')[1]}`;
          return this.json(route, 201, {
            data: {
              bucket: 'cupcake-images',
              path: objectPath,
              token: 'signed-e2e-token',
              signedUrl: `${E2E_SUPABASE}/storage/v1/object/upload/sign/cupcake-images/${objectPath}?token=signed-e2e-token`,
              expiresInSeconds: 7200,
              contentType,
              maxSizeBytes: 5242880,
            },
          });
        }
        if (action === 'image' && method === 'PUT') {
          const { path: imagePath } = this.body<{ path: string }>(route);
          if (!this.storedFiles.has(imagePath))
            return this.apiError(route, 422, 'IMAGE_NOT_UPLOADED', 'A imagem não foi enviada.');
          cupcake.imagePath = imagePath;
          return this.json(route, 200, { data: this.admin(cupcake) });
        }
      }
      if (resource === 'categories' && method === 'GET')
        return this.json(route, 200, { data: this.categories });
      if (resource === 'dietary-tags' && method === 'GET')
        return this.json(route, 200, { data: this.tags });
      if (resource === 'stock' && segments.length === 2) {
        if (method === 'PUT') {
          const { items } = this.body<{ items: Array<{ cupcakeId: string; quantity: number }> }>(
            route,
          );
          for (const item of items) {
            const cupcake = this.cupcakes.find((entry) => entry.id === item.cupcakeId);
            if (cupcake) cupcake.stock = item.quantity;
          }
        }
        return this.json(route, 200, { data: this.stockOverview() });
      }
      if (resource === 'stock' && segments[2] && method === 'PUT') {
        const cupcake = this.cupcakes.find((entry) => entry.id === segments[2]);
        if (cupcake) cupcake.stock = this.body<{ quantity: number }>(route).quantity;
        return this.json(route, 200, { data: this.stockOverview() });
      }
      if (resource === 'dashboard') {
        const completed = this.orders.filter((order) => order.status === 'COMPLETED');
        const revenue = completed.reduce(
          (sum, order) => sum + this.orderSummary(order).totalCents,
          0,
        );
        return this.json(route, 200, {
          data: {
            period: query.get('period') ?? 'today',
            timeZone: 'America/Sao_Paulo',
            range: { startDate: today(), endDate: today(), from: now(), to: now() },
            revenueCents: revenue,
            completedOrders: completed.length,
            averageTicketCents: completed.length ? Math.round(revenue / completed.length) : 0,
            revenueByFulfillment: { DELIVERY: 0, PICKUP: revenue },
            inProgress: { orders: 0, amountCents: 0 },
            cancelledOrders: 0,
            ordersByStatus: Object.fromEntries(
              Object.keys(LABELS).map((status) => [
                status,
                this.orders.filter((order) => order.status === status).length,
              ]),
            ),
            daily: [{ date: today(), revenueCents: revenue, completedOrders: completed.length }],
            topCupcakes: [],
            generatedAt: now(),
          },
        });
      }
    }

    return this.apiError(route, 404, 'NOT_FOUND', `Rota não simulada: ${method} ${path}`);
  }
}
