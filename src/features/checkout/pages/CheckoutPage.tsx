import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Clock, CreditCard, Lock, MapPin, ShoppingBag, Store } from 'lucide-react';
import type { CreateOrderBody, ShippingQuoteBody } from '@/api/contract';
import { getErrorMessage } from '@/api/errors';
import { isApiError } from '@/api/http';
import { createOrder } from '@/api/orders';
import { queryKeys } from '@/api/queryKeys';
import { getStoreInfo, quoteShipping } from '@/api/store';
import type { FulfillmentType, OrderWithCheckout } from '@/api/types';
import { LogoMark } from '@/components/brand/Logo';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  EmptyState,
  LoadingState,
  PageHeader,
  Skeleton,
  TextareaField,
} from '@/components/ui';
import { AddressForm } from '@/features/account/components/AddressForm';
import { AddressSummary } from '@/features/account/components/AddressSummary';
import { useAddresses } from '@/features/account/hooks';
import { toAddressPayload, type AddressFormValues } from '@/features/account/schemas';
import { useCart } from '@/features/cart/cartContext';
import { useCartValidation } from '@/features/cart/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCep, formatDistance, formatDuration, formatMoney } from '@/lib/format';
import { redirectTo } from '@/lib/navigation';
import { AddressChoice, NEW_ADDRESS } from '../components/AddressChoice';
import { FulfillmentOptions } from '../components/FulfillmentOptions';

type NewAddress = { address: ReturnType<typeof toAddressPayload>; save: boolean };

const QUOTE_ERROR_HINT: Record<string, string> = {
  DELIVERY_OUT_OF_RANGE: 'Que tal escolher a retirada na loja?',
  ADDRESS_NOT_LOCATED: 'Confira número, rua e CEP ou tente outro endereço.',
  GEOCODING_UNAVAILABLE: 'Tente novamente em instantes ou escolha a retirada na loja.',
};

/**
 * Checkout (US08–US10): entrega ou retirada, endereço, cotação de frete e criação do pedido.
 * Frete e total são SEMPRE calculados pelo servidor; o pagamento acontece no Checkout Pro.
 */
export function CheckoutPage() {
  useDocumentTitle('Finalizar compra');
  const { lines, clear } = useCart();
  const validation = useCartValidation(lines);
  const addresses = useAddresses();
  const store = useQuery({
    queryKey: queryKeys.store,
    queryFn: ({ signal }) => getStoreInfo(signal),
    staleTime: 30 * 60_000,
  });

  const [fulfillment, setFulfillment] = useState<FulfillmentType>('DELIVERY');
  const [choice, setChoice] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<NewAddress | null>(null);
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [notes, setNotes] = useState('');
  const [redirecting, setRedirecting] = useState<OrderWithCheckout | null>(null);

  const savedAddresses = addresses.data ?? [];
  const defaultChoice =
    savedAddresses.find((address) => address.isDefault)?.id ?? savedAddresses[0]?.id ?? NEW_ADDRESS;
  const deliveryChoice = choice ?? (addresses.isPending ? null : defaultChoice);

  // Corpo da cotação (e do pedido) conforme a escolha atual.
  let quoteBody: ShippingQuoteBody | null = null;
  if (fulfillment === 'PICKUP') quoteBody = { fulfillmentType: 'PICKUP' };
  else if (deliveryChoice && deliveryChoice !== NEW_ADDRESS)
    quoteBody = { fulfillmentType: 'DELIVERY', addressId: deliveryChoice };
  else if (deliveryChoice === NEW_ADDRESS && newAddress)
    quoteBody = { fulfillmentType: 'DELIVERY', address: newAddress.address };

  const quote = useQuery({
    queryKey: ['shipping', 'quote', quoteBody],
    queryFn: ({ signal }) => quoteShipping(quoteBody!, signal),
    enabled: quoteBody !== null,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const order = useMutation({
    mutationFn: (body: CreateOrderBody) => createOrder(body),
    onSuccess: (created) => {
      setRedirecting(created);
      clear();
      // O pedido já existe (Aguardando pagamento): o cliente paga no ambiente do Mercado Pago.
      redirectTo(created.checkout.checkoutUrl);
    },
    onError: (error) => {
      if (isApiError(error, 'CART_UNAVAILABLE')) void validation.refetch();
    },
  });

  if (redirecting) {
    return (
      <div
        className="container-page flex flex-col items-center gap-5 py-24 text-center"
        role="status"
      >
        <LogoMark className="size-14 animate-pulse text-primary" />
        <h1 className="font-display text-3xl font-semibold">Redirecionando para o pagamento…</h1>
        <p className="max-w-md text-muted">
          Pedido <strong className="text-fg">#{redirecting.orderNumber}</strong> criado. Você será
          levado ao ambiente seguro do Mercado Pago para pagar com Pix ou cartão.
        </p>
        {redirecting.checkout.sandbox && (
          <p className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs text-warning-fg">
            Ambiente de testes — nenhum valor real será cobrado
          </p>
        )}
        <a href={redirecting.checkout.checkoutUrl} className="text-sm text-primary underline">
          Clique aqui se não for redirecionado
        </a>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-14">
        <EmptyState
          icon={<ShoppingBag />}
          title="Seu carrinho está vazio"
          description="Adicione cupcakes para finalizar uma compra."
          action={<ButtonLink to="/cupcakes">Ver cupcakes</ButtonLink>}
        />
      </div>
    );
  }

  const evaluation = validation.data;
  const cartReady = Boolean(evaluation?.canCheckout) && !validation.syncing;
  const total = evaluation && quote.data ? evaluation.subtotalCents + quote.data.feeCents : null;
  const canSubmit = cartReady && Boolean(quote.data) && quoteBody !== null && !order.isPending;

  const submit = () => {
    if (!quoteBody || !canSubmit) return;
    const items = lines.map(({ cupcakeId, quantity }) => ({ cupcakeId, quantity }));
    const base = { items, notes: notes.trim() || null };
    const body: CreateOrderBody =
      quoteBody.fulfillmentType === 'PICKUP'
        ? { ...base, fulfillmentType: 'PICKUP' }
        : 'addressId' in quoteBody && quoteBody.addressId
          ? { ...base, fulfillmentType: 'DELIVERY', addressId: quoteBody.addressId }
          : {
              ...base,
              fulfillmentType: 'DELIVERY',
              address: newAddress!.address,
              saveAddress: newAddress!.save,
            };
    order.mutate(body);
  };

  const quoteError = quote.error;
  const quoteErrorCode = isApiError(quoteError) ? quoteError.code : '';

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        eyebrow="Checkout"
        title="Finalizar compra"
        description="Escolha como receber seus cupcakes. O pagamento é feito no Mercado Pago."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-4 font-display text-xl font-semibold">1. Como você quer receber?</h2>
            <FulfillmentOptions value={fulfillment} onChange={setFulfillment} />
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-xl font-semibold">
              2. {fulfillment === 'PICKUP' ? 'Retirada na loja' : 'Endereço de entrega'}
            </h2>

            {fulfillment === 'PICKUP' ? (
              // US09 CA#02: endereço da loja e tempo médio de preparo.
              <div className="flex flex-col gap-3 text-sm">
                {store.data ? (
                  <>
                    <p className="flex items-start gap-2 text-muted">
                      <Store className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        <span className="block font-medium text-fg">{store.data.name}</span>
                        {store.data.address}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 text-muted">
                      <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      Pronto em cerca de {formatDuration(store.data.pickup.estimatedMinutes)} após a
                      confirmação do pagamento.
                    </p>
                  </>
                ) : (
                  <Skeleton className="h-12 w-full" />
                )}
              </div>
            ) : addresses.isPending ? (
              <LoadingState label="Carregando seus endereços…" className="py-6" />
            ) : (
              <div className="flex flex-col gap-5">
                {addresses.isError && (
                  <Alert tone="warning">
                    Não foi possível carregar seus endereços salvos. Informe um endereço abaixo.
                  </Alert>
                )}
                {savedAddresses.length > 0 && (
                  <AddressChoice
                    addresses={savedAddresses}
                    value={deliveryChoice ?? NEW_ADDRESS}
                    onChange={(value) => setChoice(value)}
                  />
                )}
                {deliveryChoice === NEW_ADDRESS &&
                  (newAddress ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-line-strong p-4">
                      <p className="flex items-center gap-2 text-sm font-medium text-fg">
                        <MapPin className="size-4 text-primary" aria-hidden="true" /> Entregar em
                      </p>
                      <AddressSummary address={newAddress.address} />
                      {newAddress.save && (
                        <p className="text-xs text-subtle">
                          Será salvo no seu perfil quando o pagamento for confirmado.
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start"
                        onClick={() => setNewAddress(null)}
                      >
                        Alterar endereço
                      </Button>
                    </div>
                  ) : (
                    <AddressForm
                      idPrefix="checkout-address"
                      submitLabel="Calcular frete"
                      onSubmit={(values: AddressFormValues) =>
                        setNewAddress({ address: toAddressPayload(values), save: saveNewAddress })
                      }
                    >
                      <Checkbox
                        label="Salvar este endereço para compras futuras"
                        checked={saveNewAddress}
                        onChange={(event) => setSaveNewAddress(event.target.checked)}
                      />
                    </AddressForm>
                  ))}
              </div>
            )}

            {quoteBody && (
              <div className="mt-5" aria-live="polite">
                {quote.isFetching ? (
                  <p className="flex items-center gap-2 text-sm text-muted" role="status">
                    <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Calculando frete e prazo…
                  </p>
                ) : quote.isError ? (
                  <Alert
                    tone="error"
                    title="Não foi possível calcular o frete"
                    action={
                      quoteErrorCode === 'GEOCODING_UNAVAILABLE' || !quoteErrorCode ? (
                        <Button size="sm" variant="secondary" onClick={() => void quote.refetch()}>
                          Tentar novamente
                        </Button>
                      ) : undefined
                    }
                  >
                    {getErrorMessage(quoteError)} {QUOTE_ERROR_HINT[quoteErrorCode] ?? ''}
                  </Alert>
                ) : quote.data ? (
                  // US09 CA#04: valor da taxa calculado pelo servidor.
                  <dl className="grid gap-3 rounded-xl border border-success/30 bg-success/5 p-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted">Frete</dt>
                      <dd className="text-base font-semibold text-fg tabular-nums">
                        {quote.data.feeCents === 0 ? 'Grátis' : formatMoney(quote.data.feeCents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Prazo estimado</dt>
                      <dd className="text-base font-semibold text-fg">
                        {formatDuration(quote.data.estimatedMinutes)}
                      </dd>
                    </div>
                    {quote.data.distanceKm !== null && (
                      <div>
                        <dt className="text-muted">Distância</dt>
                        <dd className="text-base font-semibold text-fg">
                          {formatDistance(quote.data.distanceKm)}
                        </dd>
                      </div>
                    )}
                    {quote.data.deliveryAddress && (
                      <p className="text-xs text-subtle sm:col-span-3">
                        CEP {formatCep(quote.data.deliveryAddress.zipCode)} — estimativa por
                        distância; o valor é confirmado ao criar o pedido.
                      </p>
                    )}
                  </dl>
                ) : null}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-xl font-semibold">3. Observações</h2>
            <TextareaField
              label="Alguma observação para a cozinha?"
              optional
              maxLength={500}
              rows={3}
              placeholder="Ex.: sem granulado, embalagem para presente…"
              hint={`${notes.length}/500 caracteres`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Card>
        </div>

        <aside aria-labelledby="checkout-summary">
          <Card className="sticky top-24 flex flex-col gap-4">
            <h2 id="checkout-summary" className="font-display text-xl font-semibold">
              Resumo do pedido
            </h2>

            {validation.isError ? (
              <Alert tone="warning">{getErrorMessage(validation.error)}</Alert>
            ) : !evaluation ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {evaluation.items.map((item) => (
                  <li key={item.cupcakeId} className="flex justify-between gap-3">
                    <span className="text-muted">
                      {item.quantity}× {item.name ?? 'Cupcake'}
                      {item.status !== 'OK' && (
                        <span className="block text-xs text-danger-fg">
                          {item.status === 'INSUFFICIENT_STOCK'
                            ? `Apenas ${item.availableQuantity} disponível(is)`
                            : 'Indisponível hoje'}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {item.status === 'OK' ? formatMoney(item.subtotalCents) : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {evaluation && !evaluation.canCheckout && !validation.syncing && (
              <Alert tone="warning">
                Alguns itens mudaram de estoque. <Link to="/carrinho">Revise o carrinho</Link> para
                continuar.
              </Alert>
            )}

            <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(evaluation?.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Frete</dt>
                <dd className="tabular-nums">
                  {quote.data
                    ? quote.data.feeCents === 0
                      ? 'Grátis'
                      : formatMoney(quote.data.feeCents)
                    : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-medium text-fg">Total</dt>
                <dd className="text-2xl font-semibold text-primary tabular-nums">
                  {total !== null ? formatMoney(total) : '—'}
                </dd>
              </div>
            </dl>

            {order.isError && (
              <Alert tone="error" title="Não foi possível criar o pedido">
                {getErrorMessage(order.error)}
                {isApiError(order.error, 'TOO_MANY_PENDING_ORDERS') && (
                  <>
                    {' '}
                    <Link to="/pedidos?escopo=ativos">Ver pedidos pendentes</Link>
                  </>
                )}
              </Alert>
            )}

            <Button
              size="lg"
              fullWidth
              onClick={submit}
              disabled={!canSubmit}
              loading={order.isPending}
              leftIcon={<Lock className="size-4" aria-hidden="true" />}
            >
              Ir para o pagamento
            </Button>
            {!quote.data && (
              <p className="text-center text-xs text-subtle">
                {fulfillment === 'DELIVERY'
                  ? 'Informe o endereço para calcular o frete e liberar o pagamento.'
                  : 'Aguarde a confirmação da retirada.'}
              </p>
            )}
            <div className="flex items-start gap-2 rounded-xl bg-elevated/60 p-3 text-xs text-muted">
              <CreditCard className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p>
                Pague com <strong className="text-fg">Pix ou cartão</strong> no ambiente seguro do
                Mercado Pago. O Cupqy não armazena dados de cartão. Pedidos não pagos em 30 minutos
                são cancelados automaticamente.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
