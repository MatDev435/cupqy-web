import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bike, ChevronRight, Package, Store } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import { listOrders } from '@/api/orders';
import { queryKeys } from '@/api/queryKeys';
import type { OrderScope } from '@/api/types';
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDateTime, formatMoney, plural } from '@/lib/format';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

const SCOPE_PARAM: Record<OrderScope, string> = {
  all: 'todos',
  active: 'ativos',
  history: 'historico',
};
const PARAM_SCOPE: Record<string, OrderScope> = {
  todos: 'all',
  ativos: 'active',
  historico: 'history',
};

const PAGE_SIZE = 20; // US12 RNF#01: 20 por página

/** Meus pedidos (US12): em andamento e finalizados, do mais recente para o mais antigo. */
export function OrdersPage() {
  useDocumentTitle('Meus pedidos');
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = PARAM_SCOPE[searchParams.get('escopo') ?? ''] ?? 'all';
  const page = Math.max(1, Number(searchParams.get('pagina')) || 1);
  const query = { scope, page, pageSize: PAGE_SIZE };

  const orders = useQuery({
    queryKey: queryKeys.orders.list(query),
    queryFn: ({ signal }) => listOrders(query, signal),
    placeholderData: keepPreviousData,
  });

  const setScope = (next: OrderScope) => {
    const params = new URLSearchParams();
    if (next !== 'all') params.set('escopo', SCOPE_PARAM[next]);
    setSearchParams(params);
  };

  const list = orders.data?.data ?? [];

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        eyebrow="Minha conta"
        title="Meus pedidos"
        description="Acompanhe pedidos em andamento e reveja suas compras anteriores."
      />

      <SegmentedControl
        className="mt-8"
        label="Filtrar pedidos"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'active', label: 'Em andamento' },
          { value: 'history', label: 'Finalizados' },
        ]}
      />

      <section
        className="mt-6"
        aria-label="Lista de pedidos"
        aria-busy={orders.isFetching || undefined}
      >
        {orders.isError ? (
          <ErrorState
            message={getErrorMessage(orders.error)}
            onRetry={() => void orders.refetch()}
          />
        ) : orders.isPending ? (
          <div className="flex flex-col gap-3" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={
              scope === 'active'
                ? 'Nenhum pedido em andamento'
                : scope === 'history'
                  ? 'Nenhum pedido finalizado'
                  : 'Você ainda não fez pedidos'
            }
            description="Que tal escolher alguns cupcakes?"
            action={<ButtonLink to="/cupcakes">Ver cupcakes</ButtonLink>}
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {list.map((order) => {
                const Icon = order.fulfillmentType === 'DELIVERY' ? Bike : Store;
                const summary = order.items
                  .map((item) => `${item.quantity}× ${item.name}`)
                  .join(', ');
                return (
                  <li key={order.id}>
                    <Link
                      to={`/pedidos/${order.id}`}
                      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-primary/35 sm:p-5"
                    >
                      <span className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-elevated text-primary sm:flex">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-fg">Pedido #{order.orderNumber}</span>
                          <OrderStatusBadge status={order.status} label={order.statusLabel} />
                        </span>
                        <span className="truncate text-sm text-muted">{summary}</span>
                        <span className="text-xs text-subtle">
                          {formatDateTime(order.createdAt)} ·{' '}
                          {order.fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Retirada'} ·{' '}
                          {plural(order.itemsCount, 'item', 'itens')}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold text-fg tabular-nums">
                          {formatMoney(order.totalCents)}
                        </span>
                        <ChevronRight
                          className="size-5 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pagination
              className="mt-8"
              page={page}
              totalPages={orders.data?.meta.totalPages ?? 1}
              onPageChange={(next) => {
                const params = new URLSearchParams(searchParams);
                params.set('pagina', String(next));
                setSearchParams(params);
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
