import type { OrderStatus } from '@/api/types';
import { Badge } from '@/components/ui';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '../status';

export function OrderStatusBadge({
  status,
  label,
  size = 'sm',
}: {
  status: OrderStatus;
  label?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <Badge tone={ORDER_STATUS_TONES[status]} dot size={size}>
      {label ?? ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
