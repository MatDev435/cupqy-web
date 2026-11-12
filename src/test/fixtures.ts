import type { CupcakeDetail, CupcakeSummary, OrderDetail, OrderStatus, Page } from '@/api/types';

let sequence = 0;
const uuid = () => {
  sequence += 1;
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
};

export function buildCupcake(overrides: Partial<CupcakeDetail> = {}): CupcakeDetail {
  return {
    id: uuid(),
    name: 'Red Velvet',
    description: 'Massa aveludada com cream cheese.',
    flavor: 'Baunilha',
    priceCents: 1290,
    imageUrl: null,
    category: { id: uuid(), name: 'Clássicos', slug: 'classicos' },
    dietaryTags: [],
    stock: { available: 20, soldOut: false },
    ingredients: 'Farinha, cacau, cream cheese.',
    weightGrams: 80,
    size: 'Médio (7 cm)',
    nutritionalInfo: { servingSizeGrams: 80, calories: 300 },
    ...overrides,
  };
}

export function page<T>(data: T[], overrides: Partial<Page<T>['meta']> = {}): Page<T> {
  return {
    data,
    meta: { page: 1, pageSize: 12, total: data.length, totalPages: 1, ...overrides },
  };
}

export function toSummary(cupcake: CupcakeDetail): CupcakeSummary {
  const { ingredients: _i, weightGrams: _w, size: _s, nutritionalInfo: _n, ...summary } = cupcake;
  return summary;
}

const LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  IN_PREPARATION: 'Em preparo',
  AWAITING_COURIER: 'Aguardando entregador',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  AWAITING_PICKUP: 'Pronto para retirada',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

const DELIVERY_FLOW: OrderStatus[] = [
  'AWAITING_PAYMENT',
  'IN_PREPARATION',
  'AWAITING_COURIER',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
];
const PICKUP_FLOW: OrderStatus[] = [
  'AWAITING_PAYMENT',
  'IN_PREPARATION',
  'AWAITING_PICKUP',
  'COMPLETED',
];

/** Pedido no formato de toOrderDetail (cupqy-server/src/views/order.view.js). */
export function buildOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  const status = overrides.status ?? 'IN_PREPARATION';
  const fulfillmentType = overrides.fulfillmentType ?? 'DELIVERY';
  const flow = fulfillmentType === 'DELIVERY' ? DELIVERY_FLOW : PICKUP_FLOW;
  const current = flow.indexOf(status);
  return {
    id: 'order-1',
    orderNumber: 1042,
    status,
    statusLabel: LABELS[status],
    fulfillmentType,
    totalCents: 2830,
    itemsCount: 2,
    items: [
      {
        id: 'item-1',
        cupcakeId: 'cup-1',
        name: 'Chocolate Belga',
        unitPriceCents: 1000,
        quantity: 2,
        subtotalCents: 2000,
      },
    ],
    createdAt: '2026-11-12T13:00:00.000Z',
    paidAt: status === 'AWAITING_PAYMENT' ? null : '2026-11-12T13:02:00.000Z',
    completedAt: null,
    cancelledAt: null,
    subtotalCents: 2000,
    deliveryFeeCents: 830,
    notes: null,
    estimatedMinutes: 45,
    delivery:
      fulfillmentType === 'DELIVERY'
        ? {
            address: {
              zipCode: '01310100',
              street: 'Avenida Paulista',
              number: '1000',
              complement: null,
              neighborhood: 'Bela Vista',
              city: 'São Paulo',
              state: 'SP',
            },
            distanceKm: 2.2,
            courierName: null,
          }
        : null,
    pickup: fulfillmentType === 'PICKUP' ? { address: 'Rua Augusta, 1500' } : null,
    payment: null,
    paymentExpiresAt: status === 'AWAITING_PAYMENT' ? '2099-01-01T00:00:00.000Z' : null,
    cancellationReason: null,
    progress:
      status === 'CANCELLED'
        ? []
        : flow.map((step, index) => ({
            status: step,
            label: LABELS[step],
            reachedAt: index <= current ? '2026-11-12T13:00:00.000Z' : null,
            done: index <= current,
            current: index === current,
          })),
    statusHistory: [
      {
        fromStatus: null,
        toStatus: 'AWAITING_PAYMENT',
        label: LABELS.AWAITING_PAYMENT,
        note: null,
        createdAt: '2026-11-12T13:00:00.000Z',
      },
    ],
    updatedAt: '2026-11-12T13:05:00.000Z',
    ...overrides,
  };
}
