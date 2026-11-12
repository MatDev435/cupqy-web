import { Bike, Clock, CreditCard, History, MapPin, Store, UserRound } from 'lucide-react';
import type { OrderDetail } from '@/api/types';
import { Badge, Card } from '@/components/ui';
import { AddressSummary } from '@/features/account/components/AddressSummary';
import { formatDateTime, formatDistance, formatDuration, formatMoney } from '@/lib/format';
import { PAYMENT_STATUS_LABELS } from '../status';

/** Itens com preços do momento da compra (US12 CA#03). */
export function OrderItemsCard({ order }: { order: OrderDetail }) {
  return (
    <Card>
      <h2 className="mb-4 font-display text-xl font-semibold">Itens</h2>
      <table className="w-full text-sm">
        <caption className="sr-only">Itens do pedido #{order.orderNumber}</caption>
        <thead>
          <tr className="border-b border-line text-left text-subtle">
            <th scope="col" className="pb-2 font-medium">
              Cupcake
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Qtd.
            </th>
            <th scope="col" className="hidden pb-2 text-right font-medium sm:table-cell">
              Unitário
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-line">
              <th scope="row" className="py-2.5 text-left font-normal text-fg">
                {item.name}
              </th>
              <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
              <td className="hidden py-2.5 text-right text-muted tabular-nums sm:table-cell">
                {formatMoney(item.unitPriceCents)}
              </td>
              <td className="py-2.5 text-right tabular-nums">{formatMoney(item.subtotalCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-sm">
          <tr>
            <th scope="row" colSpan={3} className="pt-3 text-right font-normal text-muted">
              Subtotal
            </th>
            <td className="pt-3 text-right tabular-nums">{formatMoney(order.subtotalCents)}</td>
          </tr>
          <tr>
            <th scope="row" colSpan={3} className="pt-1 text-right font-normal text-muted">
              Frete
            </th>
            <td className="pt-1 text-right tabular-nums">
              {order.deliveryFeeCents === 0 ? 'Grátis' : formatMoney(order.deliveryFeeCents)}
            </td>
          </tr>
          <tr>
            <th scope="row" colSpan={3} className="pt-2 text-right font-medium text-fg">
              Total
            </th>
            <td className="pt-2 text-right text-lg font-semibold text-primary tabular-nums">
              {formatMoney(order.totalCents)}
            </td>
          </tr>
        </tfoot>
      </table>
      {order.notes && (
        <p className="mt-4 rounded-xl bg-elevated/60 p-3 text-sm text-muted">
          <span className="font-medium text-fg">Observações: </span>
          {order.notes}
        </p>
      )}
    </Card>
  );
}

/** Entrega ou retirada — exibe apenas as informações do método escolhido (US11 RN#01). */
export function OrderFulfillmentCard({ order }: { order: OrderDetail }) {
  const isDelivery = order.fulfillmentType === 'DELIVERY';
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
        {isDelivery ? (
          <Bike className="size-5 text-primary" aria-hidden="true" />
        ) : (
          <Store className="size-5 text-primary" aria-hidden="true" />
        )}
        {isDelivery ? 'Delivery' : 'Retirada na loja'}
      </h2>
      <div className="flex flex-col gap-3 text-sm">
        {isDelivery && order.delivery && (
          <>
            <div className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden="true" />
              <AddressSummary address={order.delivery.address} />
            </div>
            {order.delivery.distanceKm !== null && (
              <p className="text-muted">Distância: {formatDistance(order.delivery.distanceKm)}</p>
            )}
            {order.delivery.courierName && (
              // US11 CA#04: nome do entregador após a saída para entrega.
              <p className="flex items-center gap-2 rounded-xl border border-info/30 bg-info/8 p-3 text-fg">
                <UserRound className="size-4 text-info" aria-hidden="true" />
                Entregador: <strong>{order.delivery.courierName}</strong>
              </p>
            )}
          </>
        )}
        {!isDelivery && order.pickup && (
          <p className="flex gap-2 text-muted">
            <MapPin className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden="true" />
            {order.pickup.address}
          </p>
        )}
        {order.estimatedMinutes !== null && (
          <p className="flex items-center gap-2 text-muted">
            <Clock className="size-4 shrink-0 text-subtle" aria-hidden="true" />
            Prazo estimado: {formatDuration(order.estimatedMinutes)}
          </p>
        )}
      </div>
    </Card>
  );
}

export function OrderPaymentCard({ order }: { order: OrderDetail }) {
  const payment = order.payment;
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
        <CreditCard className="size-5 text-primary" aria-hidden="true" /> Pagamento
      </h2>
      {payment ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-subtle">Forma</dt>
            <dd className="text-fg">{payment.methodLabel ?? 'Mercado Pago'}</dd>
          </div>
          <div>
            <dt className="text-subtle">Situação</dt>
            <dd>
              <Badge
                tone={
                  payment.status === 'APPROVED'
                    ? 'success'
                    : payment.status === 'REJECTED'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
              </Badge>
            </dd>
          </div>
          {payment.approvedAt && (
            <div>
              <dt className="text-subtle">Aprovado em</dt>
              <dd className="text-fg">{formatDateTime(payment.approvedAt)}</dd>
            </div>
          )}
          {payment.refundStatus !== 'NONE' && (
            <div>
              <dt className="text-subtle">Reembolso</dt>
              <dd className="text-fg">
                {payment.refundStatus === 'COMPLETED'
                  ? 'Concluído'
                  : payment.refundStatus === 'FAILED'
                    ? 'Em nova tentativa'
                    : 'Em processamento'}
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-sm text-muted">
          {order.status === 'AWAITING_PAYMENT'
            ? 'Aguardando o pagamento no Mercado Pago.'
            : 'Nenhum pagamento registrado.'}
        </p>
      )}
    </Card>
  );
}

export function OrderHistoryCard({ order }: { order: OrderDetail }) {
  if (!order.statusHistory.length) return null;
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
        <History className="size-5 text-primary" aria-hidden="true" /> Histórico
      </h2>
      <ol className="flex flex-col gap-3 text-sm">
        {order.statusHistory.toReversed().map((entry, index) => (
          <li key={`${entry.toStatus}-${entry.createdAt}-${index}`} className="flex gap-3">
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/70"
              aria-hidden="true"
            />
            <span className="flex flex-col">
              <span className="text-fg">{entry.label}</span>
              <span className="text-xs text-subtle">
                {formatDateTime(entry.createdAt)}
                {entry.note ? ` · ${entry.note}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
