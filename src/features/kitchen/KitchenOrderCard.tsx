import { Bike, MessageSquareText, Phone, Store, Timer, UserRound } from 'lucide-react';
import type { KitchenOrder } from '@/api/types';
import { Badge, Button } from '@/components/ui';
import { AddressSummary } from '@/features/account/components/AddressSummary';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { cn } from '@/lib/cn';
import { formatElapsedMinutes, formatPhone } from '@/lib/format';

interface KitchenOrderCardProps {
  order: KitchenOrder;
  /** Minutos desde o pagamento, já considerando o tempo desde a última atualização. */
  elapsedMinutes: number;
  isNew: boolean;
  advancing: boolean;
  onAdvance: () => void;
}

/** Cartão do pedido para leitura rápida em tablets (US13 CA#03/CA#04, RNF#02). */
export function KitchenOrderCard({
  order,
  elapsedMinutes,
  isNew,
  advancing,
  onAdvance,
}: KitchenOrderCardProps) {
  const isDelivery = order.fulfillmentType === 'DELIVERY';
  const late = order.status === 'IN_PREPARATION' && elapsedMinutes >= 30;

  return (
    <article
      aria-labelledby={`kitchen-order-${order.id}`}
      className={cn(
        'flex h-full flex-col gap-4 rounded-2xl border bg-surface p-5 shadow-card',
        isNew ? 'border-primary/60 ring-2 ring-primary/20' : 'border-line',
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 id={`kitchen-order-${order.id}`} className="font-display text-3xl font-semibold">
            #{order.orderNumber}
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <OrderStatusBadge status={order.status} label={order.statusLabel} />
            {isNew && <Badge tone="primary">Novo</Badge>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            tone={isDelivery ? 'info' : 'primary'}
            size="md"
            icon={isDelivery ? <Bike /> : <Store />}
          >
            {isDelivery ? 'Delivery' : 'Retirada'}
          </Badge>
          <span
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium tabular-nums',
              late ? 'text-warning-fg' : 'text-muted',
            )}
          >
            <Timer className="size-4" aria-hidden="true" />
            <span className="sr-only">Pago há </span>
            {formatElapsedMinutes(elapsedMinutes)}
            {late && <span className="sr-only"> (atrasado)</span>}
          </span>
        </div>
      </header>

      <ul className="flex flex-col gap-2 rounded-xl bg-elevated/60 p-4" aria-label="Itens">
        {order.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-baseline gap-3 text-lg">
            <span className="min-w-10 font-display text-2xl font-semibold text-primary tabular-nums">
              {item.quantity}×
            </span>
            <span className="font-medium text-fg">{item.name}</span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="flex gap-2 rounded-xl border border-warning/35 bg-warning/8 p-3 text-sm text-fg">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            <span className="sr-only">Observação do cliente: </span>
            {order.notes}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2 text-sm text-muted">
        {order.customer.name && (
          <p className="flex items-center gap-2">
            <UserRound className="size-4 shrink-0" aria-hidden="true" /> {order.customer.name}
            {order.customer.phone && (
              <a
                href={`tel:${order.customer.phone}`}
                className="ml-auto flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="size-3.5" aria-hidden="true" />{' '}
                {formatPhone(order.customer.phone)}
              </a>
            )}
          </p>
        )}
        {order.delivery && <AddressSummary address={order.delivery.address} />}
        {order.delivery?.courierName && (
          <p className="text-fg">
            Entregador: <strong>{order.delivery.courierName}</strong>
          </p>
        )}
      </div>

      {order.nextAction && (
        // US14: botão de ação rápida com o texto da próxima etapa.
        <Button size="lg" fullWidth className="mt-auto" onClick={onAdvance} loading={advancing}>
          {order.nextAction.label}
        </Button>
      )}
    </article>
  );
}
