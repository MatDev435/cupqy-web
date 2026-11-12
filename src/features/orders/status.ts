import type { BadgeTone } from '@/components/ui';
import type { OrderStatus, PaymentStatus } from '@/api/types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  IN_PREPARATION: 'Em preparo',
  AWAITING_COURIER: 'Aguardando entregador',
  OUT_FOR_DELIVERY: 'Saiu para entrega',
  AWAITING_PICKUP: 'Pronto para retirada',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

/** Cores das tags de status da brand board (o texto sempre acompanha a cor). */
export const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  AWAITING_PAYMENT: 'neutral',
  IN_PREPARATION: 'secondary',
  AWAITING_COURIER: 'warning',
  OUT_FOR_DELIVERY: 'info',
  AWAITING_PICKUP: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export const FINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'CANCELLED'];

export function isFinal(status: OrderStatus) {
  return FINAL_STATUSES.includes(status);
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  IN_PROCESS: 'Em análise',
  AUTHORIZED: 'Autorizado',
  APPROVED: 'Aprovado',
  IN_MEDIATION: 'Em disputa',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
  CHARGED_BACK: 'Estornado',
};

export const CANCELLATION_REASONS: Record<string, string> = {
  CUSTOMER_REQUEST: 'Cancelado por você.',
  ADMIN_REQUEST: 'Cancelado pela loja.',
  PAYMENT_EXPIRED: 'O prazo para pagamento expirou.',
  PAYMENT_SETUP_FAILED: 'Não foi possível iniciar o pagamento.',
  PAYMENT_PROVIDER_ERROR: 'Não foi possível iniciar o pagamento.',
  OUT_OF_STOCK: 'Um item esgotou antes da confirmação do pagamento. O valor foi reembolsado.',
  AMOUNT_MISMATCH: 'O valor pago não confere com o pedido. O valor foi reembolsado.',
  PAYMENT_AMOUNT_MISMATCH: 'O valor pago não confere com o pedido. O valor foi reembolsado.',
  PAYMENT_REFUNDED: 'O pagamento foi estornado.',
  REFUNDED: 'O pagamento foi estornado.',
};

export function cancellationLabel(reason: string | null | undefined) {
  if (!reason) return 'Pedido cancelado.';
  return CANCELLATION_REASONS[reason] ?? reason;
}
