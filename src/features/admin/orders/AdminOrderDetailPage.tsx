import { useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, XCircle } from 'lucide-react';
import { cancelAdminOrder, getAdminOrder } from '@/api/admin';
import { getErrorMessage } from '@/api/errors';
import { isApiError } from '@/api/http';
import { queryKeys } from '@/api/queryKeys';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  TextareaField,
  useToast,
} from '@/components/ui';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import {
  OrderFulfillmentCard,
  OrderHistoryCard,
  OrderItemsCard,
  OrderPaymentCard,
} from '@/features/orders/components/OrderSections';
import { OrderTimeline } from '@/features/orders/components/OrderTimeline';
import { cancellationLabel, isFinal } from '@/features/orders/status';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDateTime } from '@/lib/format';

/** Detalhe administrativo do pedido com cancelamento (reembolso automático se pago). */
export function AdminOrderDetailPage() {
  const { orderId = '' } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const order = useQuery({
    queryKey: queryKeys.admin.order(orderId),
    queryFn: ({ signal }) => getAdminOrder(orderId, signal),
  });
  useDocumentTitle(order.data ? `Pedido #${order.data.orderNumber}` : 'Pedido');

  const cancel = useMutation({
    mutationFn: () => cancelAdminOrder(orderId, { reason: reason.trim() || null }),
    onSuccess: (updated) => {
      const wasPaid = Boolean(order.data?.paidAt);
      queryClient.setQueryData(queryKeys.admin.order(orderId), updated);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.kitchen.all });
      setCancelOpen(false);
      toast({
        tone: 'success',
        title: `Pedido #${updated.orderNumber} cancelado.`,
        description: wasPaid
          ? 'O reembolso total foi solicitado ao Mercado Pago e os itens voltaram ao estoque (se do mesmo dia).'
          : undefined,
        duration: 8000,
      });
    },
  });

  const back = (
    <ButtonLink
      to="/admin/pedidos"
      variant="ghost"
      size="sm"
      className="-ml-2"
      leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
    >
      Pedidos
    </ButtonLink>
  );

  if (order.isPending)
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {back}
        <LoadingState />
      </div>
    );
  if (order.isError || !order.data) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {back}
        {isApiError(order.error, ['ORDER_NOT_FOUND', 'NOT_FOUND', 'VALIDATION_ERROR']) ? (
          <EmptyState className="mt-6" title="Pedido não encontrado" />
        ) : (
          <ErrorState
            className="mt-6"
            message={getErrorMessage(order.error)}
            onRetry={() => void order.refetch()}
          />
        )}
      </div>
    );
  }

  const data = order.data;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {back}
      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">Pedido #{data.orderNumber}</h1>
            <OrderStatusBadge status={data.status} label={data.statusLabel} size="md" />
          </div>
          <p className="text-sm text-muted">
            Criado em {formatDateTime(data.createdAt)}
            {data.paidAt && ` · pago em ${formatDateTime(data.paidAt)}`}
          </p>
        </div>
        {!isFinal(data.status) && (
          <Button
            variant="danger"
            onClick={() => {
              cancel.reset();
              setCancelOpen(true);
            }}
            leftIcon={<XCircle className="size-4" aria-hidden="true" />}
          >
            Cancelar pedido
          </Button>
        )}
      </header>

      <div className="mt-6 flex flex-col gap-6">
        {data.status === 'CANCELLED' && (
          <Alert tone="error" title="Pedido cancelado" live={false}>
            {cancellationLabel(data.cancellationReason)}
          </Alert>
        )}
        {data.progress.length > 0 && (
          <Card>
            <h2 className="mb-6 font-display text-xl font-semibold">Andamento</h2>
            <OrderTimeline steps={data.progress} />
          </Card>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <OrderItemsCard order={data} />
          <div className="flex flex-col gap-6">
            <OrderFulfillmentCard order={data} />
            <OrderPaymentCard order={data} />
            <OrderHistoryCard order={data} />
          </div>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        dismissible={!cancel.isPending}
        title={`Cancelar o pedido #${data.orderNumber}?`}
        description={
          data.paidAt
            ? 'Este pedido já foi pago: o valor total será reembolsado pelo Mercado Pago.'
            : 'O pedido ainda não foi pago e será encerrado.'
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={cancel.isPending}
            >
              Voltar
            </Button>
            <Button variant="danger" onClick={() => cancel.mutate()} loading={cancel.isPending}>
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        {cancel.isError && (
          <Alert tone="error" className="mb-4">
            {getErrorMessage(cancel.error)}
          </Alert>
        )}
        <TextareaField
          label="Motivo"
          optional
          maxLength={200}
          rows={3}
          hint="Registrado no histórico do pedido."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
