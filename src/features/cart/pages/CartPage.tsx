import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import type { ReorderCart } from '@/api/types';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { useLiveStock } from '@/features/catalog/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatMoney, plural } from '@/lib/format';
import { useCart } from '../cartContext';
import { CartLineItem } from '../components/CartLineItem';
import { useCartValidation } from '../hooks';

export interface CartPageState {
  /** Resultado de "Repetir pedido" (US12): itens ajustados ou indisponíveis. */
  reorder?: Pick<ReorderCart, 'adjusted' | 'unavailable'>;
}

/** Carrinho (US08): revisão de itens com valores e estoque confirmados pelo servidor. */
export function CartPage() {
  useDocumentTitle('Carrinho');
  const { lines, totalQuantity, setQuantity, removeItem, clear, updateSnapshots } = useCart();
  const validation = useCartValidation(lines);
  useLiveStock(lines.length > 0);
  const location = useLocation();
  const reorder = (location.state as CartPageState | null)?.reorder;
  const [confirmClear, setConfirmClear] = useState(false);

  // Atualiza nome/preço/foto exibidos com os dados atuais do servidor.
  const evaluation = validation.data;
  useEffect(() => {
    if (!evaluation) return;
    const snapshots = Object.fromEntries(
      evaluation.items
        .filter((item) => item.name !== null)
        .map((item) => [
          item.cupcakeId,
          {
            name: item.name!,
            flavor: item.flavor,
            imageUrl: item.imageUrl,
            ...(item.unitPriceCents !== null ? { priceCents: item.unitPriceCents } : {}),
          },
        ]),
    );
    updateSnapshots(snapshots);
  }, [evaluation, updateSnapshots]);

  if (lines.length === 0) {
    return (
      <div className="container-page py-14">
        <PageHeader title="Carrinho" />
        {reorder && reorder.unavailable.length > 0 && (
          <Alert tone="warning" className="mt-6" title="Nenhum item do pedido está disponível hoje">
            {reorder.unavailable.map((item) => item.name ?? 'Cupcake').join(', ')}
          </Alert>
        )}
        <EmptyState
          className="mt-8"
          icon={<ShoppingBag />}
          title="Seu carrinho está vazio."
          description="Vamos adicionar alguns cupcakes?"
          action={<ButtonLink to="/cupcakes">Ver cupcakes</ButtonLink>}
        />
      </div>
    );
  }

  const issues = evaluation?.issues ?? [];
  const canCheckout =
    Boolean(evaluation?.canCheckout) && !validation.syncing && !validation.isError;

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        title="Carrinho"
        description={plural(totalQuantity, 'item', 'itens')}
        actions={
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            Esvaziar carrinho
          </Button>
        }
      />

      {reorder && (reorder.adjusted.length > 0 || reorder.unavailable.length > 0) && (
        <Alert tone="warning" className="mt-6" title="Alguns itens do pedido mudaram">
          <ul className="list-disc pl-4">
            {reorder.adjusted.map((item) => (
              <li key={item.cupcakeId}>
                {item.name}: adicionamos {item.addedQuantity} de {item.requestedQuantity} (estoque
                de hoje).
              </li>
            ))}
            {reorder.unavailable.map((item) => (
              <li key={item.cupcakeId}>{item.name ?? 'Cupcake'}: indisponível hoje.</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="cart-items-title">
          <h2 id="cart-items-title" className="sr-only">
            Itens do carrinho
          </h2>
          {validation.isError && (
            <Alert
              tone="warning"
              className="mb-4"
              title="Não foi possível conferir preços e estoque"
              action={
                <Button size="sm" variant="secondary" onClick={() => void validation.refetch()}>
                  Tentar novamente
                </Button>
              }
            >
              {getErrorMessage(validation.error)}
            </Alert>
          )}
          {issues.length > 0 && !validation.syncing && (
            <Alert tone="warning" className="mb-4" title="Revise os itens destacados">
              Alguns cupcakes esgotaram ou têm estoque menor que a quantidade escolhida.
            </Alert>
          )}
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface px-4 sm:px-6">
            {lines.map((line) => (
              <CartLineItem
                key={line.cupcakeId}
                line={line}
                evaluation={validation.byId.get(line.cupcakeId)}
                onQuantityChange={(quantity) => setQuantity(line.cupcakeId, quantity)}
                onRemove={() => removeItem(line.cupcakeId)}
              />
            ))}
          </ul>
          <Link
            to="/cupcakes"
            className="mt-4 inline-block text-sm text-muted underline-offset-4 hover:text-primary hover:underline"
          >
            Continuar comprando
          </Link>
        </section>

        <aside aria-labelledby="cart-summary-title">
          <Card className="sticky top-24 flex flex-col gap-4">
            <h2 id="cart-summary-title" className="font-display text-xl font-semibold">
              Resumo
            </h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Itens</dt>
                <dd className="tabular-nums">{totalQuantity}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Frete</dt>
                <dd className="text-muted">calculado no checkout</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                <dt className="font-medium text-fg">Subtotal</dt>
                <dd className="text-2xl font-semibold text-primary tabular-nums" aria-live="polite">
                  {evaluation ? (
                    formatMoney(evaluation.subtotalCents)
                  ) : (
                    <Skeleton className="h-7 w-24" />
                  )}
                </dd>
              </div>
            </dl>
            {validation.syncing && (
              <p className="text-xs text-subtle" role="status">
                Atualizando valores com a loja…
              </p>
            )}
            {canCheckout ? (
              <ButtonLink
                to="/checkout"
                size="lg"
                fullWidth
                rightIcon={<ArrowRight className="size-5" aria-hidden="true" />}
              >
                Finalizar compra
              </ButtonLink>
            ) : (
              <Button size="lg" fullWidth disabled>
                Finalizar compra
              </Button>
            )}
            <p className="text-xs text-subtle">
              Os valores são confirmados pela loja no momento do pedido. O pagamento é feito no
              ambiente seguro do Mercado Pago.
            </p>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Esvaziar carrinho?"
        description="Todos os cupcakes serão removidos."
        confirmLabel="Esvaziar"
        tone="danger"
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
