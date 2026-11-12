/**
 * Tipos de ENTRADA derivados do contrato OpenAPI gerado a partir dos validators Zod da API.
 * Se o back-end mudar um corpo/parâmetro, `npm run api:sync` atualiza o snapshot e o `tsc`
 * aponta as divergências no front-end.
 */
import type { paths } from './generated/openapi';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

type JsonBodyOf<Operation> = Operation extends {
  requestBody?: { content: { 'application/json': infer Body } };
}
  ? Body
  : never;

type QueryOf<Operation> = Operation extends { parameters: { query?: infer Query } }
  ? NonNullable<Query>
  : never;

export type RequestBody<
  Path extends keyof paths,
  M extends Method & keyof paths[Path],
> = JsonBodyOf<paths[Path][M]>;

export type RequestQuery<Path extends keyof paths, M extends Method & keyof paths[Path]> = QueryOf<
  paths[Path][M]
>;

/* Corpos usados pelo front-end */
export type UpdateProfileBody = RequestBody<'/api/v1/users/me', 'patch'>;
export type DeleteAccountBody = RequestBody<'/api/v1/users/me', 'delete'>;
export type CreateAddressBody = RequestBody<'/api/v1/users/me/addresses', 'post'>;
export type UpdateAddressBody = RequestBody<'/api/v1/users/me/addresses/{addressId}', 'patch'>;
export type ValidateCartBody = RequestBody<'/api/v1/cart/validate', 'post'>;
export type ShippingQuoteBody = RequestBody<'/api/v1/shipping/quote', 'post'>;
export type CreateOrderBody = RequestBody<'/api/v1/orders', 'post'>;
export type SyncPaymentBody = RequestBody<'/api/v1/orders/{orderId}/payment/sync', 'post'>;
export type AdvanceOrderBody = RequestBody<'/api/v1/kitchen/orders/{orderId}/advance', 'post'>;
export type CreateCupcakeBody = RequestBody<'/api/v1/admin/cupcakes', 'post'>;
export type UpdateCupcakeBody = RequestBody<'/api/v1/admin/cupcakes/{cupcakeId}', 'patch'>;
export type ImageUploadBody = RequestBody<
  '/api/v1/admin/cupcakes/{cupcakeId}/image/upload-url',
  'post'
>;
export type AttachImageBody = RequestBody<'/api/v1/admin/cupcakes/{cupcakeId}/image', 'put'>;
export type CategoryBody = RequestBody<'/api/v1/admin/categories', 'post'>;
export type UpdateCategoryBody = RequestBody<'/api/v1/admin/categories/{categoryId}', 'patch'>;
export type DietaryTagBody = RequestBody<'/api/v1/admin/dietary-tags', 'post'>;
export type SetStockBody = RequestBody<'/api/v1/admin/stock', 'put'>;
export type SetSingleStockBody = RequestBody<'/api/v1/admin/stock/{cupcakeId}', 'put'>;
export type AdminCancelOrderBody = RequestBody<'/api/v1/admin/orders/{orderId}/cancel', 'post'>;
export type ChangeRoleBody = RequestBody<'/api/v1/admin/users/{userId}/role', 'patch'>;

/* Query strings */
export type CatalogQuery = RequestQuery<'/api/v1/cupcakes', 'get'>;
export type OrdersQuery = RequestQuery<'/api/v1/orders', 'get'>;
export type KitchenQuery = RequestQuery<'/api/v1/kitchen/orders', 'get'>;
export type AdminCupcakesQuery = RequestQuery<'/api/v1/admin/cupcakes', 'get'>;
export type AdminOrdersQuery = RequestQuery<'/api/v1/admin/orders', 'get'>;
export type AdminUsersQuery = RequestQuery<'/api/v1/admin/users', 'get'>;
export type DashboardQuery = RequestQuery<'/api/v1/admin/dashboard', 'get'>;
export type StockQuery = RequestQuery<'/api/v1/admin/stock', 'get'>;
