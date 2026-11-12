/**
 * Tipos das RESPOSTAS da API, alinhados às views do cupqy-server (src/views/*.view.js) e aos
 * schemas do contrato OpenAPI (openapi/openapi.json). Os corpos de requisição usam os tipos
 * gerados do contrato — ver src/api/contract.ts.
 *
 * Valores monetários: inteiros em centavos. Datas: strings ISO 8601.
 */

export type Role = 'CUSTOMER' | 'BAKER' | 'ADMIN';

export type Permission =
  | 'profile:manage-own'
  | 'orders:create'
  | 'orders:read-own'
  | 'orders:read-any'
  | 'kitchen:access'
  | 'catalog:manage'
  | 'stock:manage'
  | 'orders:manage'
  | 'finance:read'
  | 'users:manage';

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'IN_PREPARATION'
  | 'AWAITING_COURIER'
  | 'OUT_FOR_DELIVERY'
  | 'AWAITING_PICKUP'
  | 'COMPLETED'
  | 'CANCELLED';

export type KitchenStatus = Extract<
  OrderStatus,
  'IN_PREPARATION' | 'AWAITING_COURIER' | 'OUT_FOR_DELIVERY' | 'AWAITING_PICKUP'
>;

export type FulfillmentType = 'DELIVERY' | 'PICKUP';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

/* ------------------------------- Perfil ---------------------------------- */

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: Role;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface AddressSnapshot {
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export interface Address extends AddressSnapshot {
  id: string;
  label: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------- Catálogo -------------------------------- */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface DietaryTag {
  id: string;
  name: string;
  slug: string;
}

export interface Stock {
  available: number;
  soldOut: boolean;
}

export interface CupcakeSummary {
  id: string;
  name: string;
  description: string;
  flavor: string;
  priceCents: number;
  imageUrl: string | null;
  category: Category | null;
  dietaryTags: DietaryTag[];
  stock: Stock;
}

export interface NutritionalInfo {
  servingSizeGrams?: number;
  calories?: number;
  carbohydratesGrams?: number;
  proteinsGrams?: number;
  totalFatGrams?: number;
  saturatedFatGrams?: number;
  transFatGrams?: number;
  fiberGrams?: number;
  sugarsGrams?: number;
  sodiumMg?: number;
}

export interface CupcakeDetail extends CupcakeSummary {
  ingredients: string;
  weightGrams: number | null;
  size: string | null;
  nutritionalInfo: NutritionalInfo | null;
}

export type CatalogSort = 'name' | 'price_asc' | 'price_desc';

/* ---------------------------- Loja e frete ------------------------------- */

export interface StoreInfo {
  name: string;
  address: string;
  timeZone: string;
  pickup: { feeCents: number; estimatedMinutes: number };
  delivery: { baseFeeCents: number; feePerKmCents: number; maxDistanceKm: number };
}

export interface CepAddress {
  zipCode: string;
  street: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
}

export interface ShippingQuote {
  fulfillmentType: FulfillmentType;
  feeCents: number;
  distanceKm: number | null;
  estimatedMinutes: number;
  pickupAddress: string | null;
  deliveryAddress: AddressSnapshot | null;
}

/* ------------------------------- Carrinho -------------------------------- */

export type CartItemStatus = 'OK' | 'SOLD_OUT' | 'INSUFFICIENT_STOCK' | 'UNAVAILABLE';

export interface CartEvaluationItem {
  cupcakeId: string;
  name: string | null;
  flavor: string | null;
  imageUrl: string | null;
  unitPriceCents: number | null;
  quantity: number;
  availableQuantity: number;
  subtotalCents: number;
  status: CartItemStatus;
}

export interface CartIssue {
  cupcakeId: string;
  name: string | null;
  status: Exclude<CartItemStatus, 'OK'>;
  requestedQuantity: number;
  availableQuantity: number;
}

export interface CartEvaluation {
  stockDate: string;
  items: CartEvaluationItem[];
  totalQuantity: number;
  subtotalCents: number;
  issues: CartIssue[];
  canCheckout: boolean;
}

/* -------------------------------- Pedidos -------------------------------- */

export type PaymentStatus =
  | 'PENDING'
  | 'IN_PROCESS'
  | 'AUTHORIZED'
  | 'APPROVED'
  | 'IN_MEDIATION'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'CHARGED_BACK';

export type RefundStatus = 'NONE' | 'PENDING' | 'COMPLETED' | 'FAILED';

export interface OrderPayment {
  id: string;
  provider: string;
  status: PaymentStatus;
  statusDetail: string | null;
  method: string | null;
  type: string | null;
  methodLabel: string | null;
  amountCents: number;
  approvedAt: string | null;
  refundStatus: RefundStatus;
}

export interface OrderLine {
  name: string;
  quantity: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  statusLabel: string;
  fulfillmentType: FulfillmentType;
  totalCents: number;
  itemsCount: number;
  items: OrderLine[];
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface OrderItem extends OrderLine {
  id: string;
  cupcakeId: string;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface OrderProgressStep {
  status: OrderStatus;
  label: string;
  reachedAt: string | null;
  done: boolean;
  current: boolean;
}

export interface OrderStatusHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  label: string;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotalCents: number;
  deliveryFeeCents: number;
  notes: string | null;
  estimatedMinutes: number | null;
  delivery: {
    address: AddressSnapshot;
    distanceKm: number | null;
    courierName: string | null;
  } | null;
  pickup: { address: string } | null;
  items: OrderItem[];
  payment: OrderPayment | null;
  paymentExpiresAt: string | null;
  cancellationReason: string | null;
  progress: OrderProgressStep[];
  statusHistory: OrderStatusHistoryEntry[];
  updatedAt: string;
}

export interface CheckoutInfo {
  preferenceId: string;
  checkoutUrl: string;
  sandbox: boolean;
  expiresAt: string;
}

export interface OrderWithCheckout extends OrderDetail {
  checkout: CheckoutInfo;
}

export interface ReorderItem {
  cupcakeId: string;
  name: string;
  flavor: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  previousUnitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface ReorderCart {
  sourceOrderId: string;
  items: ReorderItem[];
  subtotalCents: number;
  adjusted: Array<{
    cupcakeId: string;
    name: string;
    requestedQuantity: number;
    addedQuantity: number;
  }>;
  unavailable: Array<{ cupcakeId: string; name: string | null; reason: CartItemStatus }>;
  canCheckout: boolean;
}

export type OrderScope = 'active' | 'history' | 'all';

/* -------------------------------- Cozinha -------------------------------- */

export interface KitchenNextAction {
  nextStatus: OrderStatus;
  label: string;
  requiresCourierName: boolean;
}

export interface KitchenOrder {
  id: string;
  orderNumber: number;
  status: KitchenStatus;
  statusLabel: string;
  fulfillmentType: FulfillmentType;
  paidAt: string | null;
  elapsedMinutes: number;
  items: OrderLine[];
  totalItems: number;
  notes: string | null;
  customer: { name: string | null; phone: string | null };
  delivery: { address: AddressSnapshot; courierName: string | null } | null;
  nextAction: KitchenNextAction | null;
}

export interface KitchenQueue {
  data: KitchenOrder[];
  meta: { summary: Record<KitchenStatus, number> };
}

/* ------------------------------ Administração ---------------------------- */

export interface AdminCupcake extends CupcakeDetail {
  isActive: boolean;
  imagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImageUpload {
  bucket: string;
  path: string;
  token: string;
  signedUrl: string;
  expiresInSeconds: number;
  contentType: string;
  maxSizeBytes: number;
}

export interface StockItem {
  cupcake: {
    id: string;
    name: string;
    flavor: string;
    imageUrl: string | null;
    isActive: boolean;
  };
  quantity: number;
  isSet: boolean;
  lowStock: boolean;
  soldOut: boolean;
  updatedAt: string | null;
}

export interface StockOverview {
  date: string;
  lowStockThreshold: number;
  summary: {
    activeCupcakes: number;
    totalUnits: number;
    lowStock: number;
    soldOut: number;
    notSet: number;
  };
  items: StockItem[];
}

export interface AdminOrderSummary extends OrderSummary {
  subtotalCents: number;
  deliveryFeeCents: number;
  cancellationReason: string | null;
  customer: { name: string | null; email: string | null };
}

export interface AdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: Role;
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DashboardPeriod = 'today' | 'week' | 'month';

export interface Dashboard {
  period: DashboardPeriod;
  timeZone: string;
  range: { startDate: string; endDate: string; from: string; to: string };
  revenueCents: number;
  completedOrders: number;
  averageTicketCents: number;
  revenueByFulfillment: Record<FulfillmentType, number>;
  inProgress: { orders: number; amountCents: number };
  cancelledOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  daily: Array<{ date: string; revenueCents: number; completedOrders: number }>;
  topCupcakes: Array<{ cupcakeId: string; name: string; quantity: number; revenueCents: number }>;
  generatedAt: string;
}
