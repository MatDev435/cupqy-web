import type {
  AdminCancelOrderBody,
  AdminCupcakesQuery,
  AdminOrdersQuery,
  AdminUsersQuery,
  AttachImageBody,
  CategoryBody,
  ChangeRoleBody,
  CreateCupcakeBody,
  DashboardQuery,
  DietaryTagBody,
  ImageUploadBody,
  SetSingleStockBody,
  SetStockBody,
  StockQuery,
  UpdateCategoryBody,
  UpdateCupcakeBody,
} from './contract';
import { getData, request, sendData } from './http';
import type {
  AdminCupcake,
  AdminOrderSummary,
  AdminUser,
  Category,
  Dashboard,
  DietaryTag,
  ImageUpload,
  OrderDetail,
  Page,
  StockOverview,
} from './types';

const auth = 'required' as const;
const id = (value: string) => encodeURIComponent(value);

/* ------------------------------- Cupcakes -------------------------------- */

export function listAdminCupcakes(query: AdminCupcakesQuery = {}, signal?: AbortSignal) {
  return request<Page<AdminCupcake>>('/admin/cupcakes', { query, auth, signal });
}

export function getAdminCupcake(cupcakeId: string, signal?: AbortSignal) {
  return getData<AdminCupcake>(`/admin/cupcakes/${id(cupcakeId)}`, { auth, signal });
}

export function createCupcake(body: CreateCupcakeBody) {
  return sendData<AdminCupcake>('POST', '/admin/cupcakes', { body, auth });
}

export function updateCupcake(cupcakeId: string, body: UpdateCupcakeBody) {
  return sendData<AdminCupcake>('PATCH', `/admin/cupcakes/${id(cupcakeId)}`, { body, auth });
}

/** Exclusão lógica ("soft") se o cupcake já foi vendido; física ("hard") caso contrário. */
export function deleteCupcake(cupcakeId: string) {
  return sendData<{ id: string; deletion: 'soft' | 'hard' }>(
    'DELETE',
    `/admin/cupcakes/${id(cupcakeId)}`,
    { auth },
  );
}

export function requestImageUpload(cupcakeId: string, body: ImageUploadBody) {
  return sendData<ImageUpload>('POST', `/admin/cupcakes/${id(cupcakeId)}/image/upload-url`, {
    body,
    auth,
  });
}

export function attachImage(cupcakeId: string, body: AttachImageBody) {
  return sendData<AdminCupcake>('PUT', `/admin/cupcakes/${id(cupcakeId)}/image`, { body, auth });
}

export function removeImage(cupcakeId: string) {
  return sendData<AdminCupcake>('DELETE', `/admin/cupcakes/${id(cupcakeId)}/image`, { auth });
}

/* ------------------------- Categorias e restrições ----------------------- */

export function listAdminCategories(signal?: AbortSignal) {
  return getData<Category[]>('/admin/categories', { auth, signal });
}

export function createCategory(body: CategoryBody) {
  return sendData<Category>('POST', '/admin/categories', { body, auth });
}

export function updateCategory(categoryId: string, body: UpdateCategoryBody) {
  return sendData<Category>('PATCH', `/admin/categories/${id(categoryId)}`, { body, auth });
}

export function deleteCategory(categoryId: string) {
  return request<void>(`/admin/categories/${id(categoryId)}`, { method: 'DELETE', auth });
}

export function listAdminDietaryTags(signal?: AbortSignal) {
  return getData<DietaryTag[]>('/admin/dietary-tags', { auth, signal });
}

export function createDietaryTag(body: DietaryTagBody) {
  return sendData<DietaryTag>('POST', '/admin/dietary-tags', { body, auth });
}

export function updateDietaryTag(tagId: string, body: DietaryTagBody) {
  return sendData<DietaryTag>('PATCH', `/admin/dietary-tags/${id(tagId)}`, { body, auth });
}

export function deleteDietaryTag(tagId: string) {
  return request<void>(`/admin/dietary-tags/${id(tagId)}`, { method: 'DELETE', auth });
}

/* -------------------------------- Estoque -------------------------------- */

export function getStock(query: StockQuery = {}, signal?: AbortSignal) {
  return getData<StockOverview>('/admin/stock', { query, auth, signal });
}

export function getStockAlerts(query: StockQuery = {}, signal?: AbortSignal) {
  return getData<StockOverview>('/admin/stock/alerts', { query, auth, signal });
}

export function setStock(body: SetStockBody) {
  return sendData<StockOverview>('PUT', '/admin/stock', { body, auth });
}

export function setCupcakeStock(cupcakeId: string, body: SetSingleStockBody) {
  return sendData<StockOverview>('PUT', `/admin/stock/${id(cupcakeId)}`, { body, auth });
}

/* -------------------------------- Pedidos -------------------------------- */

export function listAdminOrders(query: AdminOrdersQuery = {}, signal?: AbortSignal) {
  return request<Page<AdminOrderSummary>>('/admin/orders', { query, auth, signal });
}

export function getAdminOrder(orderId: string, signal?: AbortSignal) {
  return getData<OrderDetail>(`/admin/orders/${id(orderId)}`, { auth, signal });
}

/** Cancela pedido não finalizado; se já pago, a API solicita o reembolso no Mercado Pago. */
export function cancelAdminOrder(orderId: string, body: AdminCancelOrderBody) {
  return sendData<OrderDetail>('POST', `/admin/orders/${id(orderId)}/cancel`, { body, auth });
}

/* ------------------------------- Dashboard ------------------------------- */

export function getDashboard(query: DashboardQuery = {}, signal?: AbortSignal) {
  return getData<Dashboard>('/admin/dashboard', { query, auth, signal });
}

/* -------------------------------- Usuários ------------------------------- */

export function listUsers(query: AdminUsersQuery = {}, signal?: AbortSignal) {
  return request<Page<AdminUser>>('/admin/users', { query, auth, signal });
}

export function changeUserRole(userId: string, body: ChangeRoleBody) {
  return sendData<AdminUser>('PATCH', `/admin/users/${id(userId)}/role`, { body, auth });
}
