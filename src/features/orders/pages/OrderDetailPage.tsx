import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import { isApiError } from '@/api/http';
import { cancelOrder, getOrder, renewPayment, reorder, syncPayment } from '@/api/orders';
import { queryKeys } from '@/api/queryKeys';
import type { OrderDetail } from '@/api/types';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  useToast,
} from '@/components/ui';
import { useCart } from '@/features/cart/cartContext';
import type { CartPageState } from '@/features/cart/pages/CartPage';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNow } from '@/hooks/useNow';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { formatDateTime, formatTime } from '@/lib/format';
import { redirectTo } from '@/lib/navigation';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import {
  OrderFulfillmentCard,
  OrderHistoryCard,
  OrderItemsCard,
  OrderPaymentCard,
} from '../components/OrderSections';
import { OrderTimeline } from '../components/OrderTimeline';
import { cancellationLabel, isFinal } from '../status';

type PaymentReturn = 'sucesso' | 'pendente' | 'falha';
const RETURN_TYPES: PaymentReturn[] = ['sucesso', 'pendente', 'falha'];

/**
 * Ao voltar do Checkout Pro (…/pedidos/:id?pagamento=…&payment_id=…), consulta o estado
 * CONFIRMADO no servidor (POST /payment/sync). O parâmetro da URL nunca é tratado como pagamento
 * aprovado — ele só ajusta a mensagem enquanto o servidor confirma.
 */
function usePaymentReturn(orderId: string) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('pagamento');
  const [returned] = useState<PaymentReturn | null>(
    RETURN_TYPES.includes(raw as PaymentReturn) ? (raw as PaymentReturn) : null,
  );
  const started = useRef(false);

  const sync = useMutation({
    mutationFn: (paymentId: string | undefined) => syncPayment(orderId, paymentId),
    onSuccess: async (order) => {
      // Uma leitura iniciada antes da sincronização não pode sobrescrever o estado confirmado.
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.setQueryData(queryKeys.orders.detail(orderId), order);
    },
  });

  useEffect(() => {
    if (!returned || started.current) return;
    started.current = true;
    const candidate = searchParams.get('payment_id') ?? searchParams.get('collection_id');
    sync.mutate(candidate && /^\d{1,20}$/.test(candidate) ? candidate : undefined);
    // Remove os parâmetros do Mercado Pago da barra de endereços.
    setSearchParams({}, { replace: true });
  }, [returned, searchParams, setSearchParams, sync]);

  return { returned, syncing: sync.isPending, syncError: sync.error };
}

function PaymentBanner({
  order,
  returned,
  syncing,
  syncError,
  onPay,
  paying,
}: {
  order: OrderDetail;
  returned: PaymentReturn | null;
  syncing: boolean;
  syncError: unknown;
  onPay: () => void;
  paying: boolean;
}) {
  const now = useNow(30_000);

  if (order.status === 'CANCELLED') {
    return (
      <Alert tone="error" title="Pedido cancelado" live={false}>
        {cancellationLabel(order.cancellationReason)}
      </Alert>
    );
  }

  if (order.status !== 'AWAITING_PAYMENT') {
    return returned ? (
      <Alert tone="success" title="Pagamento confirmado!">
        Pedido #{order.orderNumber} confirmado. Acompanhe abaixo cada etapa, em tempo real.
      </Alert>
    ) : null;
  }

  if (syncing) {
    return (
      <Alert tone="info" title="Confirmando o pagamento com o Mercado Pago…">
        Isso leva só alguns segundos.
      </Alert>
    );
  }

  const expiresAt = order.paymentExpiresAt ? new Date(order.paymentExpiresAt).getTime() : null;
  const minutesLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 60_000)) : null;
  const expired = minutesLeft === 0;
  const rejected =
    returned === 'falha' ||
    order.payment?.status === 'REJECTED' ||
    order.payment?.status === 'CANCELLED';
  const pending =
    returned === 'pendente' ||
    returned === 'sucesso' ||
    order.payment?.status === 'PENDING' ||
    order.payment?.status === 'IN_PROCESS';

  const deadline =
    expiresAt && !expired ? (
      <>
        {' '}
        Pague até <strong className="text-fg">
          {formatTime(order.paymentExpiresAt)}
        </strong> (faltam {minutesLeft} min).
      </>
    ) : null;

  const payAction = !expired && (
    <Button
      size="sm"
      onClick={onPay}
      loading={paying}
      leftIcon={<CreditCard className="size-4" aria-hidden="true" />}
    >
      {rejected ? 'Tentar pagar novamente' : 'Pagar agora'}
    </Button>
  );

  if (expired) {
    return (
      <Alert tone="warning" title="Prazo de pagamento encerrado">
        O pedido será cancelado automaticamente em instantes. Faça um novo pedido quando quiser.
      </Alert>
    );
  }

  if (rejected) {
    return (
      <Alert tone="error" title="Pagamento não aprovado" action={payAction}>
        O Mercado Pago recusou o pagamento. Você pode tentar novamente com outra forma de pagamento.
        {deadline}
      </Alert>
    );
  }

  if (pending) {
    return (
      <Alert tone="info" title="Pagamento em processamento" action={payAction}>
        {syncError
          ? 'Ainda não conseguimos confirmar com o Mercado Pago. A confirmação aparecerá aqui automaticamente.'
          : 'Se você pagou com Pix, a confirmação pode levar alguns instantes — esta tela atualiza sozinha.'}
        {deadline}
      </Alert>
    );
  }

  return (
    <Alert tone="warning" title="Aguardando pagamento" action={payAction}>
      Conclua o pagamento no Mercado Pago (Pix ou cartão).{deadline}
    </Alert>
  );
}

/** Acompanhamento e detalhes do pedido (US10 CA#05, US11, US12). */
export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cart = useCart();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { returned, syncing, syncError } = usePaymentReturn(orderId);

  const detailKey = queryKeys.orders.detail(orderId);
  // Realtime: mudanças no pedido e novas entradas de histórico (RLS: só os pedidos do cliente).
  const { connected } = useRealtimeInvalidation({
    table: 'orders',
    filter: `id=eq.${orderId}`,
    event: 'UPDATE',
    queryKeys: [detailKey],
    enabled: Boolean(orderId),
  });
  useRealtimeInvalidation({
    table: 'order_status_history',
    filter: `order_id=eq.${orderId}`,
    event: 'INSERT',
    queryKeys: [detailKey],
    enabled: Boolean(orderId),
  });

  const order = useQuery({
    queryKey: detailKey,
    queryFn: ({ signal }) => getOrder(orderId, signal),
    // Alternativa ao Realtime: polling enquanto o pedido estiver ativo (US11 RNF#01).
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || isFinal(data.status)) return false;
      if (connected) return 60_000;
      return data.status === 'AWAITING_PAYMENT' ? 10_000 : 30_000;
    },
  });
  const data = order.data;
  useDocumentTitle(data ? `Pedido #${data.orderNumber}` : 'Pedido');

  const pay = useMutation({
    mutationFn: () => renewPayment(orderId),
    onSuccess: (result) => redirectTo(result.checkout.checkoutUrl),
    onError: (error) =>
      toast({
        tone: 'error',
        title: 'Não foi possível gerar o pagamento',
        description: getErrorMessage(error),
      }),
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: async (updated) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      queryClient.setQueryData(detailKey, updated);
      void queryClient.invalidateQueries({ queryKey: ['orders', 'list'] });
      setConfirmCancel(false);
      toast({ tone: 'success', title: 'Pedido cancelado.' });
    },
    onError: (error) => {
      setConfirmCancel(false);
      toast({
        tone: 'error',
        title: 'Não foi possível cancelar',
        description: getErrorMessage(error),
      });
    },
  });

  // US12 CA#05 / RN#01-02: repete com preços atuais e apenas o que há em estoque hoje.
  const repeat = useMutation({
    mutationFn: () => reorder(orderId),
    onSuccess: (result) => {
      for (const item of result.items) {
        cart.addItem(
          item.cupcakeId,
          {
            name: item.name,
            flavor: item.flavor,
            imageUrl: item.imageUrl,
            priceCents: item.unitPriceCents,
          },
          item.quantity,
        );
      }
      navigate('/carrinho', {
        state: {
          reorder: { adjusted: result.adjusted, unavailable: result.unavailable },
        } satisfies CartPageState,
      });
    },
    onError: (error) =>
      toast({
        tone: 'error',
        title: 'Não foi possível repetir o pedido',
        description: getErrorMessage(error),
      }),
  });

  const back = (
    <ButtonLink
      to="/pedidos"
      variant="ghost"
      size="sm"
      className="-ml-2"
      leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
    >
      Meus pedidos
    </ButtonLink>
  );

  if (order.isPending) {
    return (
      <div className="container-page py-8">
        {back}
        <LoadingState label="Carregando pedido…" />
      </div>
    );
  }

  if (order.isError || !data) {
    const notFound = isApiError(order.error, ['ORDER_NOT_FOUND', 'NOT_FOUND', 'VALIDATION_ERROR']);
    return (
      <div className="container-page py-8">
        {back}
        <div className="mt-6">
          {notFound ? (
            <EmptyState
              title="Pedido não encontrado"
              description="Confira o link ou veja a lista dos seus pedidos."
              action={<ButtonLink to="/pedidos">Ver meus pedidos</ButtonLink>}
            />
          ) : (
            <ErrorState
              message={getErrorMessage(order.error)}
              onRetry={() => void order.refetch()}
            />
          )}
        </div>
      </div>
    );
  }

  const awaitingPayment = data.status === 'AWAITING_PAYMENT';

  return (
    <div className="container-page py-8">
      {back}

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              Pedido #{data.orderNumber}
            </h1>
            <OrderStatusBadge status={data.status} label={data.statusLabel} size="md" />
          </div>
          <p className="text-sm text-muted">
            Realizado em {formatDateTime(data.createdAt)} ·{' '}
            {data.fulfillmentType === 'DELIVERY' ? 'Delivery' : 'Retirada na loja'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void order.refetch()}
            loading={order.isRefetching}
            leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
          >
            Atualizar
          </Button>
          {isFinal(data.status) && (
            <Button
              size="sm"
              onClick={() => repeat.mutate()}
              loading={repeat.isPending}
              leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
            >
              Repetir pedido
            </Button>
          )}
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-6">
        <PaymentBanner
          order={data}
          returned={returned}
          syncing={syncing}
          syncError={syncError}
          onPay={() => pay.mutate()}
          paying={pay.isPending}
        />

        {data.progress.length > 0 && (
          <Card>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold">Acompanhamento</h2>
              <p className="flex items-center gap-2 text-xs text-subtle" aria-live="polite">
                <span
                  className={`size-2 rounded-full ${connected ? 'bg-success' : 'bg-subtle'}`}
                  aria-hidden="true"
                />
                {connected ? 'Atualização em tempo real' : 'Atualização automática periódica'}
              </p>
            </div>
            <OrderTimeline steps={data.progress} />
          </Card>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <OrderItemsCard order={data} />
          <div className="flex flex-col gap-6">
            <OrderFulfillmentCard order={data} />
            <OrderPaymentCard order={data} />
            <OrderHistoryCard order={data} />
            {awaitingPayment && (
              <Button
                variant="ghost"
                className="hover:text-danger-fg"
                leftIcon={<XCircle className="size-4" aria-hidden="true" />}
                onClick={() => setConfirmCancel(true)}
              >
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancelar o pedido #${data.orderNumber}?`}
        description="O pedido ainda não foi pago. Depois de cancelado, não poderá ser retomado."
        confirmLabel="Cancelar pedido"
        cancelLabel="Manter pedido"
        tone="danger"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
