import { Link } from 'react-router';
import { Trash2 } from 'lucide-react';
import type { CartEvaluationItem } from '@/api/types';
import { CupcakeImage } from '@/components/brand/CupcakeImage';
import { Badge, Button, QuantityStepper } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import type { CartLine } from '../cartStore';
import { MAX_QUANTITY_PER_ITEM } from '../cartStore';

interface CartLineItemProps {
  line: CartLine;
  evaluation: CartEvaluationItem | undefined;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

/** Linha do carrinho (US08 CA#02/CA#03): foto, nome, sabor, preço, quantidade e subtotal. */
export function CartLineItem({ line, evaluation, onQuantityChange, onRemove }: CartLineItemProps) {
  const name = evaluation?.name ?? line.snapshot.name;
  const unitPrice = evaluation?.unitPriceCents ?? line.snapshot.priceCents;
  const status = evaluation?.status;
  const available = evaluation?.availableQuantity;
  const max =
    status === 'OK' || status === 'INSUFFICIENT_STOCK'
      ? Math.max(1, Math.min(available ?? MAX_QUANTITY_PER_ITEM, MAX_QUANTITY_PER_ITEM))
      : MAX_QUANTITY_PER_ITEM;
  const subtotal =
    status === 'OK'
      ? evaluation!.subtotalCents
      : unitPrice !== null
        ? unitPrice * line.quantity
        : null;
  const blocked = status === 'SOLD_OUT' || status === 'UNAVAILABLE';

  return (
    <li className="flex gap-4 py-5">
      <Link
        to={`/cupcakes/${line.cupcakeId}`}
        tabIndex={-1}
        aria-hidden="true"
        className="shrink-0"
      >
        <CupcakeImage
          src={evaluation?.imageUrl ?? line.snapshot.imageUrl}
          alt=""
          className="size-20 rounded-xl border border-line sm:size-24"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-fg">
              <Link to={`/cupcakes/${line.cupcakeId}`} className="hover:text-primary">
                {name}
              </Link>
            </h3>
            <p className="text-sm text-muted">
              {evaluation?.flavor ?? line.snapshot.flavor}
              {unitPrice !== null && (
                <>
                  {' · '}
                  <span className="tabular-nums">{formatMoney(unitPrice)}</span> cada
                </>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remover ${name} do carrinho`}
            className="-mt-1 -mr-2 shrink-0 hover:text-danger-fg"
          >
            <Trash2 className="size-[18px]" aria-hidden="true" />
          </Button>
        </div>

        {status === 'SOLD_OUT' && (
          <Badge tone="danger" className="self-start">
            Esgotado hoje — remova para continuar
          </Badge>
        )}
        {status === 'UNAVAILABLE' && (
          <Badge tone="danger" className="self-start">
            Indisponível — remova para continuar
          </Badge>
        )}
        {status === 'INSUFFICIENT_STOCK' && available !== undefined && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Apenas {available} disponível(is) hoje</Badge>
            {available > 0 && (
              <Button size="sm" variant="ghost" onClick={() => onQuantityChange(available)}>
                Ajustar para {available}
              </Button>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={line.quantity}
            onChange={onQuantityChange}
            min={1}
            max={Math.max(max, line.quantity > max ? line.quantity : max)}
            itemLabel={name}
            disabled={blocked}
          />
          <p className="font-semibold text-fg tabular-nums">
            <span className="sr-only">Subtotal: </span>
            {blocked ? '—' : formatMoney(subtotal)}
          </p>
        </div>
      </div>
    </li>
  );
}
