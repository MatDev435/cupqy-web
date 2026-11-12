import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Package, Search } from 'lucide-react';
import { listAdminOrders } from '@/api/admin';
import type { AdminOrdersQuery } from '@/api/contract';
import { getErrorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { FulfillmentType, OrderStatus } from '@/api/types';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
} from '@/components/ui';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { ORDER_STATUS_LABELS } from '@/features/orders/status';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDateTime, formatMoney, onlyDigits, plural } from '@/lib/format';

const FILTER_KEYS = ['status', 'tipo', 'de', 'ate', 'numero', 'pagina'] as const;

/** Todos os pedidos da loja, com filtros por status, tipo, período e número. */
export function AdminOrdersPage() {
  useDocumentTitle('Pedidos');
  const [params, setParams] = useSearchParams();
  const [number, setNumber] = useState(params.get('numero') ?? '');
  const debouncedNumber = useDebouncedValue(onlyDigits(number), 400);
  const status = (params.get('status') ?? '') as OrderStatus | '';
  const type = (params.get('tipo') ?? '') as FulfillmentType | '';
  const from = params.get('de') ?? '';
  const to = params.get('ate') ?? '';
  const page = Math.max(1, Number(params.get('pagina')) || 1);

  const query: AdminOrdersQuery = {
    status: status || undefined,
    fulfillmentType: type || undefined,
    from: from || undefined,
    to: to || undefined,
    orderNumber: debouncedNumber ? Number(debouncedNumber) : undefined,
    page,
    pageSize: 20,
  };

  const orders = useQuery({
    queryKey: queryKeys.admin.orders(query),
    queryFn: ({ signal }) => listAdminOrders(query, signal),
    placeholderData: keepPreviousData,
  });

  const setParam = (key: (typeof FILTER_KEYS)[number], value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'pagina') next.delete('pagina');
    setParams(next, { replace: true });
  };
  const hasFilters = Boolean(status || type || from || to || number);
  const list = orders.data?.data ?? [];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Pedidos" description="Acompanhe e gerencie todos os pedidos da loja." />

      <div
        role="search"
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-[12rem_1fr_1fr_10rem_10rem_auto]"
      >
        <div>
          <label htmlFor="orders-number" className="sr-only">
            Número do pedido
          </label>
          <Input
            id="orders-number"
            inputMode="numeric"
            placeholder="Nº do pedido"
            leftIcon={<Search />}
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="orders-status" className="sr-only">
            Status
          </label>
          <Select
            id="orders-status"
            value={status}
            onChange={(event) => setParam('status', event.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="orders-type" className="sr-only">
            Tipo de entrega
          </label>
          <Select
            id="orders-type"
            value={type}
            onChange={(event) => setParam('tipo', event.target.value)}
          >
            <option value="">Delivery e retirada</option>
            <option value="DELIVERY">Delivery</option>
            <option value="PICKUP">Retirada</option>
          </Select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="orders-from" className="sr-only">
            Data inicial
          </label>
          <Input
            id="orders-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setParam('de', event.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="orders-to" className="sr-only">
            Data final
          </label>
          <Input
            id="orders-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setParam('ate', event.target.value)}
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setNumber('');
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      <section className="mt-6" aria-label="Pedidos" aria-busy={orders.isFetching || undefined}>
        {orders.isError ? (
          <ErrorState
            message={getErrorMessage(orders.error)}
            onRetry={() => void orders.refetch()}
          />
        ) : orders.isPending ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={hasFilters ? 'Nenhum pedido com esses filtros' : 'Nenhum pedido ainda'}
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {plural(orders.data.meta.total, 'pedido', 'pedidos')}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[48rem] text-sm">
                <caption className="sr-only">Pedidos da loja</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Pedido
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Cliente
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Tipo
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-line last:border-0 hover:bg-elevated/40"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/pedidos/${order.id}`}
                          className="font-semibold text-fg hover:text-primary"
                        >
                          #{order.orderNumber}
                        </Link>
                        <p className="text-xs text-subtle">{formatDateTime(order.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-fg">{order.customer.name ?? 'Cliente removido'}</p>
                        <p className="text-xs text-subtle">{order.customer.email ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {order.fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Retirada'}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} label={order.statusLabel} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatMoney(order.totalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              className="mt-6"
              page={page}
              totalPages={orders.data.meta.totalPages}
              onPageChange={(next) => setParam('pagina', String(next))}
            />
          </>
        )}
      </section>
    </div>
  );
}
