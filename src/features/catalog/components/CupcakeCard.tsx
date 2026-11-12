import { Link } from 'react-router';
import { ShoppingCart } from 'lucide-react';
import type { CupcakeSummary } from '@/api/types';
import { CupcakeImage } from '@/components/brand/CupcakeImage';
import { Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { stockLevel } from '../stock';
import { DietaryTagBadges } from './DietaryTagBadges';
import { StockBadge } from './StockBadge';

interface CupcakeCardProps {
  cupcake: CupcakeSummary;
  onAdd?: (cupcake: CupcakeSummary) => void;
  adding?: boolean;
  /** Nível do título (h2 em listagens principais, h3 dentro de seções). */
  headingLevel?: 'h2' | 'h3';
}

/** Card de produto da brand board: foto, nome, descrição, preço e adicionar ao carrinho. */
export function CupcakeCard({ cupcake, onAdd, adding, headingLevel = 'h3' }: CupcakeCardProps) {
  const Heading = headingLevel;
  const soldOut = stockLevel(cupcake.stock) === 'sold-out';

  return (
    <article
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card',
        'transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/35',
        'focus-within:border-primary/50',
      )}
    >
      <div className="relative m-2 mb-0 overflow-hidden rounded-xl">
        <CupcakeImage
          src={cupcake.imageUrl}
          alt={cupcake.name}
          className="aspect-[4/3]"
          imgClassName={cn(
            'transition-transform duration-500 group-hover:scale-[1.04]',
            soldOut && 'grayscale-[60%]',
          )}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 92vw"
        />
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <StockBadge stock={cupcake.stock} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-4 pt-3 pb-4">
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          {cupcake.category?.name ?? 'Cupcake'} · {cupcake.flavor}
        </p>
        <Heading className="text-lg leading-snug font-semibold text-fg">
          <Link
            to={`/cupcakes/${cupcake.id}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
          >
            {cupcake.name}
          </Link>
        </Heading>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">{cupcake.description}</p>
        <DietaryTagBadges tags={cupcake.dietaryTags} />
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <p className="text-xl font-semibold text-primary tabular-nums">
            <span className="sr-only">Preço: </span>
            {formatMoney(cupcake.priceCents)}
          </p>
          {onAdd && (
            <Button
              size="icon"
              className="relative z-10 shrink-0"
              onClick={() => onAdd(cupcake)}
              loading={adding}
              disabled={soldOut}
              aria-label={
                soldOut ? `${cupcake.name} esgotado` : `Adicionar ${cupcake.name} ao carrinho`
              }
            >
              {!adding && <ShoppingCart className="size-5" aria-hidden="true" />}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function CupcakeCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-2">
      <Skeleton className="aspect-[4/3] rounded-xl" />
      <div className="flex flex-col gap-2.5 px-2 pt-4 pb-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <div className="mt-3 flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="size-11 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
