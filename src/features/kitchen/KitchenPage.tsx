import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChefHat, RefreshCw } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import { isApiError } from '@/api/http';
import { advanceKitchenOrder, listKitchenOrders } from '@/api/kitchen';
import { queryKeys } from '@/api/queryKeys';
import type { FulfillmentType, KitchenOrder, KitchenStatus } from '@/api/types';
import {
  Button,
  EmptyState,
  ErrorState,
  Modal,
  SegmentedControl,
  Skeleton,
  TextField,
  useToast,
} from '@/components/ui';
import { ORDER_STATUS_LABELS } from '@/features/orders/status';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { formatTime } from '@/lib/format';
import { KitchenOrderCard } from './KitchenOrderCard';

type StatusFilter = KitchenStatus | 'ALL';
type TypeFilter = FulfillmentType | 'ALL';

const STATUS_FILTERS: KitchenStatus[] = [
  'IN_PREPARATION',
  'AWAITING_COURIER',
  'OUT_FOR_DELIVERY',
  'AWAITING_PICKUP',
];

const NEW_HIGHLIGHT_MS = 2 * 60_000;

/** Painel da cozinha (US13/US14): fila de pedidos pagos em tempo real e avanço de etapas. */
export function KitchenPage() {
  useDocumentTitle('Painel da cozinha');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const now = useNow(30_000);
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [courierFor, setCourierFor] = useState<KitchenOrder | null>(null);
  const [courierName, setCourierName] = useState('');
  const [courierError, setCourierError] = useState<string>();

  const query = {
    ...(status !== 'ALL' ? { status } : {}),
    ...(type !== 'ALL' ? { fulfillmentType: type } : {}),
  };

  // US13 CA#05 / RNF#03: novos pedidos pagos chegam por conexão persistente (Supabase Realtime).
  const { connected } = useRealtimeInvalidation({
    table: 'orders',
    queryKeys: [queryKeys.kitchen.all],
  });

  const queue = useQuery({
    queryKey: queryKeys.kitchen.list(query),
    queryFn: ({ signal }) => listKitchenOrders(query, signal),
    placeholderData: keepPreviousData,
    refetchInterval: connected ? 60_000 : 15_000,
  });

  const orders = queue.data?.data;
  // Pedidos pagos há pouco tempo ganham destaque e são anunciados para leitores de tela.
  const isNew = (order: KitchenOrder) =>
    order.status === 'IN_PREPARATION' &&
    order.paidAt !== null &&
    now - new Date(order.paidAt).getTime() < NEW_HIGHLIGHT_MS;
  const newOrders = (orders ?? []).filter(isNew);
  const announcement = newOrders.length
    ? `Novos pedidos na fila: ${newOrders.map((order) => `#${order.orderNumber}`).join(', ')}`
    : '';

  const advance = useMutation({
    mutationFn: ({ order, courier }: { order: KitchenOrder; courier?: string }) =>
      advanceKitchenOrder(order.id, {
        expectedStatus: order.status,
        ...(courier ? { courierName: courier } : {}),
      }),
    onSuccess: (updated) => {
      setCourierFor(null);
      toast({
        tone: 'success',
        title: `Pedido #${updated.orderNumber} atualizado`,
        description: updated.statusLabel,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.kitchen.all });
    },
    onError: (error) => {
      if (isApiError(error, 'COURIER_NAME_REQUIRED')) {
        setCourierError('Informe o nome do entregador.');
        return;
      }
      setCourierFor(null);
      toast({
        tone: isApiError(error, 'ORDER_STATUS_CHANGED') ? 'warning' : 'error',
        title: isApiError(error, 'ORDER_STATUS_CHANGED')
          ? 'Este pedido já foi atualizado por outra pessoa'
          : 'Não foi possível atualizar o pedido',
        description: getErrorMessage(error),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.kitchen.all });
    },
  });

  const onAdvance = (order: KitchenOrder) => {
    if (order.nextAction?.requiresCourierName) {
      setCourierName(order.delivery?.courierName ?? '');
      setCourierError(undefined);
      setCourierFor(order);
      return;
    }
    advance.mutate({ order });
  };

  const submitCourier = () => {
    const name = courierName.trim();
    if (name.length < 2) {
      setCourierError('Informe o nome do entregador.');
      return;
    }
    if (courierFor) advance.mutate({ order: courierFor, courier: name });
  };

  const summary = queue.data?.meta.summary;
  const total = summary ? Object.values(summary).reduce((sum, value) => sum + value, 0) : undefined;
  const minutesSinceFetch = queue.dataUpdatedAt
    ? Math.max(0, Math.floor((now - queue.dataUpdatedAt) / 60_000))
    : 0;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Painel da cozinha</h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            <span
              className={`size-2 rounded-full ${connected ? 'bg-success' : 'bg-warning'}`}
              aria-hidden="true"
            />
            {connected ? 'Tempo real ativo' : 'Atualizando a cada 15 segundos'}
            {queue.dataUpdatedAt > 0 &&
              ` · atualizado às ${formatTime(new Date(queue.dataUpdatedAt))}`}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void queue.refetch()}
          loading={queue.isRefetching}
          leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          Atualizar
        </Button>
      </header>

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <SegmentedControl
          label="Filtrar por etapa"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'ALL', label: 'Todos', count: total },
            ...STATUS_FILTERS.map((value) => ({
              value,
              label: ORDER_STATUS_LABELS[value],
              count: summary?.[value],
            })),
          ]}
        />
        <SegmentedControl
          label="Filtrar por tipo de entrega"
          value={type}
          onChange={setType}
          size="sm"
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'DELIVERY', label: 'Delivery' },
            { value: 'PICKUP', label: 'Retirada' },
          ]}
        />
      </div>

      <section className="mt-6" aria-label="Fila de pedidos">
        {queue.isError ? (
          <ErrorState message={getErrorMessage(queue.error)} onRetry={() => void queue.refetch()} />
        ) : queue.isPending ? (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : !orders?.length ? (
          <EmptyState
            icon={<ChefHat />}
            title="Nenhum pedido na fila"
            description="Novos pedidos pagos aparecem aqui automaticamente."
          />
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {orders.map((order) => (
              <li key={order.id}>
                <KitchenOrderCard
                  order={order}
                  elapsedMinutes={order.elapsedMinutes + minutesSinceFetch}
                  isNew={isNew(order)}
                  advancing={advance.isPending && advance.variables?.order.id === order.id}
                  onAdvance={() => onAdvance(order)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={courierFor !== null}
        onClose={() => setCourierFor(null)}
        dismissible={!advance.isPending}
        title={courierFor ? `Saída para entrega — #${courierFor.orderNumber}` : ''}
        description="O nome do entregador será exibido para o cliente."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCourierFor(null)}
              disabled={advance.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={submitCourier} loading={advance.isPending}>
              Confirmar saída
            </Button>
          </>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submitCourier();
          }}
        >
          <TextField
            label="Nome do entregador"
            required
            autoFocus
            maxLength={120}
            value={courierName}
            onChange={(event) => setCourierName(event.target.value)}
            error={courierError}
          />
        </form>
      </Modal>
    </div>
  );
}
