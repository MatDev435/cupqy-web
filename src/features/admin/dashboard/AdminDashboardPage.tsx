import { lazy, Suspense, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { getDashboard } from '@/api/admin';
import { getErrorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { Dashboard, DashboardPeriod, OrderStatus } from '@/api/types';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  PageHeader,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';
import { formatDateOnly, formatMoney, formatTime, plural } from '@/lib/format';
import { MeterList } from './MeterList';

const RevenueChart = lazy(() =>
  import('./RevenueChart').then((m) => ({ default: m.RevenueChart })),
);

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today: 'Hoje',
  week: 'Semana',
  month: 'Mês',
};

const STATUS_ORDER: OrderStatus[] = [
  'AWAITING_PAYMENT',
  'IN_PREPARATION',
  'AWAITING_COURIER',
  'OUT_FOR_DELIVERY',
  'AWAITING_PICKUP',
  'COMPLETED',
  'CANCELLED',
];

function share(part: number, total: number) {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : '0%';
}

function StatTile({
  label,
  value,
  detail,
  hero = false,
}: {
  label: string;
  value: string;
  detail?: string;
  hero?: boolean;
}) {
  return (
    <Card
      padded={false}
      className={cn('flex flex-col gap-1 p-5', hero && 'sm:col-span-2 lg:col-span-1')}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn('font-semibold text-fg', hero ? 'text-5xl leading-tight' : 'text-3xl')}>
        {value}
      </dd>
      {detail && <dd className="text-xs text-subtle">{detail}</dd>}
    </Card>
  );
}

function periodDescription(data: Dashboard) {
  const { startDate, endDate } = data.range;
  return startDate === endDate
    ? formatDateOnly(startDate)
    : `${formatDateOnly(startDate)} a ${formatDateOnly(endDate)}`;
}

/**
 * Dashboard financeiro (US16): faturamento e pedidos concluídos no período (hoje, semana ou mês
 * no fuso da loja), calculados pela API — apenas pedidos Concluídos entram no faturamento.
 */
export function AdminDashboardPage() {
  useDocumentTitle('Dashboard');
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const dashboard = useQuery({
    queryKey: queryKeys.admin.dashboard(period),
    queryFn: ({ signal }) => getDashboard({ period }, signal),
    placeholderData: keepPreviousData,
  });
  const data = dashboard.data;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Dashboard"
        description={
          data
            ? `${PERIOD_LABELS[data.period]} · ${periodDescription(data)} · atualizado às ${formatTime(data.generatedAt)}`
            : 'Faturamento e pedidos da loja.'
        }
      />

      {/* Filtros em uma linha, acima de tudo o que eles afetam (US16 CA#03/CA#04). */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Período"
          value={period}
          onChange={setPeriod}
          options={(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map((value) => ({
            value,
            label: PERIOD_LABELS[value],
          }))}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void dashboard.refetch()}
          loading={dashboard.isFetching}
          leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          Atualizar
        </Button>
      </div>

      {dashboard.isError && !data ? (
        <ErrorState
          className="mt-6"
          message={getErrorMessage(dashboard.error)}
          onRetry={() => void dashboard.refetch()}
        />
      ) : !data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            'mt-6 flex flex-col gap-6 transition-opacity',
            dashboard.isPlaceholderData && 'opacity-60',
          )}
          aria-busy={dashboard.isFetching || undefined}
        >
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              hero
              label="Faturamento"
              value={formatMoney(data.revenueCents)}
              detail="Somente pedidos concluídos"
            />
            <StatTile
              label="Pedidos concluídos"
              value={data.completedOrders.toLocaleString('pt-BR')}
              detail={`Ticket médio ${formatMoney(data.averageTicketCents)}`}
            />
            <StatTile
              label="Em andamento"
              value={data.inProgress.orders.toLocaleString('pt-BR')}
              detail={`${formatMoney(data.inProgress.amountCents)} pagos aguardando conclusão`}
            />
            <StatTile
              label="Cancelados"
              value={data.cancelledOrders.toLocaleString('pt-BR')}
              detail="No período"
            />
          </dl>

          <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
            <Card>
              <CardHeader
                title="Faturamento por dia"
                description="Pedidos concluídos, no fuso horário da loja."
              />
              {data.daily.length > 1 ? (
                <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
                  <RevenueChart daily={data.daily} />
                </Suspense>
              ) : (
                <p className="rounded-xl bg-elevated/50 p-4 text-sm text-muted">
                  O gráfico diário aparece nos períodos Semana e Mês. Hoje:{' '}
                  <strong className="text-fg">{formatMoney(data.revenueCents)}</strong> em{' '}
                  {plural(data.completedOrders, 'pedido concluído', 'pedidos concluídos')}.
                </p>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Por tipo de entrega"
                description="Faturamento dos pedidos concluídos."
              />
              <MeterList
                label="Faturamento por tipo de entrega"
                items={[
                  { key: 'DELIVERY', label: 'Delivery', value: data.revenueByFulfillment.DELIVERY },
                  {
                    key: 'PICKUP',
                    label: 'Retirada na loja',
                    value: data.revenueByFulfillment.PICKUP,
                  },
                ].map((item) => ({
                  ...item,
                  display: `${formatMoney(item.value)} · ${share(item.value, data.revenueCents)}`,
                }))}
              />
            </Card>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Mais vendidos"
                description="Unidades em pedidos concluídos no período."
              />
              {data.topCupcakes.length ? (
                <MeterList
                  label="Cupcakes mais vendidos"
                  items={data.topCupcakes.map((item) => ({
                    key: item.cupcakeId,
                    label: item.name,
                    value: item.quantity,
                    display: `${plural(item.quantity, 'unidade', 'unidades')} · ${formatMoney(item.revenueCents)}`,
                  }))}
                />
              ) : (
                <p className="text-sm text-muted">Nenhuma venda concluída no período.</p>
              )}
            </Card>

            <Card>
              <CardHeader title="Pedidos por status" description="Pedidos criados no período." />
              <table className="w-full text-sm">
                <caption className="sr-only">Pedidos criados no período por status</caption>
                <tbody>
                  {STATUS_ORDER.map((status) => (
                    <tr key={status} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2 text-left font-normal">
                        <OrderStatusBadge status={status} />
                      </th>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {data.ordersByStatus[status] ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
