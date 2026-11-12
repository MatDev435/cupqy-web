import type { CreateOrderBody, OrdersQuery } from './contract';
import { getData, request, sendData } from './http';
import type { OrderDetail, OrderSummary, OrderWithCheckout, Page, ReorderCart } from './types';

const path = (orderId: string) => `/orders/${encodeURIComponent(orderId)}`;

/** Finaliza o checkout: cria o pedido (Aguardando pagamento) e a preferência do Checkout Pro. */
export function createOrder(body: CreateOrderBody) {
  return sendData<OrderWithCheckout>('POST', '/orders', { body, auth: 'required' });
}

export function listOrders(query: OrdersQuery = {}, signal?: AbortSignal) {
  return request<Page<OrderSummary>>('/orders', { query, auth: 'required', signal });
}

export function getOrder(orderId: string, signal?: AbortSignal) {
  return getData<OrderDetail>(path(orderId), { auth: 'required', signal });
}

/** Novo link de pagamento para pedido que ainda aguarda pagamento. */
export function renewPayment(orderId: string) {
  return sendData<OrderWithCheckout>('POST', `${path(orderId)}/payment`, { auth: 'required' });
}

/** Ao voltar do Checkout Pro: a API consulta o Mercado Pago e devolve o estado confirmado. */
export function syncPayment(orderId: string, paymentId?: string) {
  return sendData<OrderDetail>('POST', `${path(orderId)}/payment/sync`, {
    body: paymentId ? { paymentId } : {},
    auth: 'required',
  });
}

export function reorder(orderId: string) {
  return sendData<ReorderCart>('POST', `${path(orderId)}/reorder`, { auth: 'required' });
}

export function cancelOrder(orderId: string) {
  return sendData<OrderDetail>('POST', `${path(orderId)}/cancel`, { auth: 'required' });
}
