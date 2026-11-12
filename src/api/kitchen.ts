import type { AdvanceOrderBody, KitchenQuery } from './contract';
import { request, sendData } from './http';
import type { KitchenOrder, KitchenQueue } from './types';

/** Fila da cozinha: pedidos pagos e ativos, do pagamento mais antigo para o mais recente. */
export function listKitchenOrders(query: KitchenQuery = {}, signal?: AbortSignal) {
  return request<KitchenQueue>('/kitchen/orders', { query, auth: 'required', signal });
}

/** Avança para a próxima etapa; `expectedStatus` ativa o controle otimista (409 se mudou). */
export function advanceKitchenOrder(orderId: string, body: AdvanceOrderBody) {
  return sendData<KitchenOrder>('POST', `/kitchen/orders/${encodeURIComponent(orderId)}/advance`, {
    body,
    auth: 'required',
  });
}
