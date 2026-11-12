import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Ruler, ShoppingCart, Weight, Wheat } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import { isApiError } from '@/api/http';
import type { NutritionalInfo } from '@/api/types';
import { CupcakeImage } from '@/components/brand/CupcakeImage';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  QuantityStepper,
  Skeleton,
} from '@/components/ui';
import { useCart } from '@/features/cart/cartContext';
import { MAX_QUANTITY_PER_ITEM } from '@/features/cart/cartStore';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatMoney } from '@/lib/format';
import { DietaryTagBadges } from '../components/DietaryTagBadges';
import { StockBadge } from '../components/StockBadge';
import { useCupcake, useLiveStock } from '../hooks';
import { stockLevel } from '../stock';

const NUTRITION_ROWS: Array<{ key: keyof NutritionalInfo; label: string; unit: string }> = [
  { key: 'servingSizeGrams', label: 'Porção', unit: 'g' },
  { key: 'calories', label: 'Valor energético', unit: 'kcal' },
  { key: 'carbohydratesGrams', label: 'Carboidratos', unit: 'g' },
  { key: 'sugarsGrams', label: 'Açúcares', unit: 'g' },
  { key: 'proteinsGrams', label: 'Proteínas', unit: 'g' },
  { key: 'totalFatGrams', label: 'Gorduras totais', unit: 'g' },
  { key: 'saturatedFatGrams', label: 'Gorduras saturadas', unit: 'g' },
  { key: 'transFatGrams', label: 'Gorduras trans', unit: 'g' },
  { key: 'fiberGrams', label: 'Fibra alimentar', unit: 'g' },
  { key: 'sodiumMg', label: 'Sódio', unit: 'mg' },
];

function DetailSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2" aria-hidden="true">
      <Skeleton className="aspect-square rounded-3xl" />
      <div className="flex flex-col gap-4 pt-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-6 h-12 w-full" />
      </div>
    </div>
  );
}

/** Página do produto (US07): foto, ingredientes, peso, tabela nutricional e quantidade. */
export function CupcakeDetailPage() {
  const { cupcakeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: cupcake, isPending, isError, error, refetch, isFetching } = useCupcake(cupcakeId);
  useLiveStock();
  const { getQuantity } = useCart();
  const { add, pendingId } = useAddToCart();
  const [quantity, setQuantity] = useState(1);
  useDocumentTitle(cupcake?.name ?? 'Cupcake');

  // Volta exatamente para onde o cliente estava no catálogo (US07 CA#05).
  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/cupcakes');
  };

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={goBack}
      leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
      className="-ml-2"
    >
      Voltar
    </Button>
  );

  if (isPending) {
    return (
      <div className="container-page py-8">
        {backButton}
        <p role="status" className="sr-only">
          Carregando cupcake…
        </p>
        <div className="mt-6">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !cupcake) {
    const notFound = isApiError(error, 'CUPCAKE_NOT_FOUND') || isApiError(error, 'NOT_FOUND');
    return (
      <div className="container-page py-8">
        {backButton}
        <div className="mt-6">
          {notFound ? (
            <EmptyState
              title="Cupcake não encontrado"
              description="Ele pode ter saído do cardápio."
              action={<ButtonLink to="/cupcakes">Ver cardápio</ButtonLink>}
            />
          ) : (
            <ErrorState
              message={getErrorMessage(error)}
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          )}
        </div>
      </div>
    );
  }

  const soldOut = stockLevel(cupcake.stock) === 'sold-out';
  const inCart = getQuantity(cupcake.id);
  // US07 RN#01: entre 1 e o disponível hoje (descontando o que já está no carrinho).
  const maxSelectable = Math.max(
    0,
    Math.min(cupcake.stock.available, MAX_QUANTITY_PER_ITEM) - inCart,
  );
  const selected = Math.min(quantity, Math.max(1, maxSelectable));
  const nutrition = NUTRITION_ROWS.filter(
    (row) => cupcake.nutritionalInfo?.[row.key] !== undefined,
  );

  return (
    <div className="container-page py-8">
      {backButton}

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="relative">
          <CupcakeImage
            src={cupcake.imageUrl}
            alt={cupcake.name}
            priority
            className="relative aspect-square rounded-3xl border border-line shadow-pop"
            sizes="(min-width: 1024px) 560px, 92vw"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {cupcake.category && (
              <Link to={`/cupcakes?categoria=${cupcake.category.slug}`}>
                <Badge tone="primary">{cupcake.category.name}</Badge>
              </Link>
            )}
            <Badge>{cupcake.flavor}</Badge>
            <StockBadge stock={cupcake.stock} showAvailable />
          </div>

          <h1 className="font-display text-4xl leading-tight font-semibold text-fg sm:text-5xl">
            {cupcake.name}
          </h1>
          <p className="text-3xl font-semibold text-primary tabular-nums">
            <span className="sr-only">Preço unitário: </span>
            {formatMoney(cupcake.priceCents)}
          </p>
          <p className="leading-relaxed text-muted">{cupcake.description}</p>
          <DietaryTagBadges tags={cupcake.dietaryTags} size="md" />

          {(cupcake.weightGrams || cupcake.size) && (
            <dl className="flex flex-wrap gap-6 text-sm">
              {cupcake.weightGrams && (
                <div className="flex items-center gap-2">
                  <Weight className="size-4 text-primary" aria-hidden="true" />
                  <dt className="text-muted">Peso médio:</dt>
                  <dd className="font-medium text-fg">{cupcake.weightGrams} g</dd>
                </div>
              )}
              {cupcake.size && (
                <div className="flex items-center gap-2">
                  <Ruler className="size-4 text-primary" aria-hidden="true" />
                  <dt className="text-muted">Tamanho:</dt>
                  <dd className="font-medium text-fg">{cupcake.size}</dd>
                </div>
              )}
            </dl>
          )}

          <Card className="mt-2 flex flex-col gap-4" padded>
            {soldOut ? (
              // US07 RN#02: sem estoque, o botão dá lugar à etiqueta "Esgotado".
              <div className="flex flex-col gap-2">
                <Badge tone="danger" size="md" className="self-start">
                  Esgotado
                </Badge>
                <p className="text-sm text-muted">
                  Este sabor esgotou hoje. Confira outras opções no cardápio.
                </p>
              </div>
            ) : maxSelectable === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Você já tem no carrinho toda a quantidade disponível hoje ({inCart}).
                </p>
                <ButtonLink to="/carrinho" variant="secondary">
                  Ver carrinho
                </ButtonLink>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <QuantityStepper
                    value={selected}
                    onChange={setQuantity}
                    min={1}
                    max={maxSelectable}
                    itemLabel={cupcake.name}
                  />
                  <p className="text-sm text-muted">
                    Subtotal:{' '}
                    <span className="font-semibold text-fg tabular-nums">
                      {formatMoney(cupcake.priceCents * selected)}
                    </span>
                  </p>
                </div>
                <Button
                  size="lg"
                  fullWidth
                  loading={pendingId === cupcake.id}
                  leftIcon={<ShoppingCart className="size-5" aria-hidden="true" />}
                  onClick={async () => {
                    const added = await add(cupcake, selected);
                    if (added) setQuantity(1);
                  }}
                >
                  Adicionar ao carrinho
                </Button>
                {inCart > 0 && (
                  <p className="text-center text-xs text-subtle">
                    Você já tem {inCart} no carrinho.
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
            <Wheat className="size-5 text-primary" aria-hidden="true" /> Ingredientes
          </h2>
          <p className="leading-relaxed text-muted">{cupcake.ingredients}</p>
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-xl font-semibold">Informação nutricional</h2>
          {nutrition.length ? (
            <table className="w-full text-sm">
              <caption className="sr-only">Tabela nutricional por unidade</caption>
              <thead>
                <tr className="border-b border-line text-left text-subtle">
                  <th scope="col" className="pb-2 font-medium">
                    Nutriente
                  </th>
                  <th scope="col" className="pb-2 text-right font-medium">
                    Por unidade
                  </th>
                </tr>
              </thead>
              <tbody>
                {nutrition.map((row) => (
                  <tr key={row.key} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 text-left font-normal text-muted">
                      {row.label}
                    </th>
                    <td className="py-2 text-right font-medium text-fg tabular-nums">
                      {cupcake.nutritionalInfo?.[row.key]?.toLocaleString('pt-BR')} {row.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">Informação nutricional não cadastrada.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
