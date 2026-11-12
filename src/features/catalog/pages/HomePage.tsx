import { Link } from 'react-router';
import { ArrowRight, Bike, CreditCard, Sparkles, Store, Wheat } from 'lucide-react';
import heroImage from '@/assets/brand/hero-chocolate.jpg';
import refBerries from '@/assets/brand/ref-berries.jpg';
import refChocolate from '@/assets/brand/ref-chocolate.jpg';
import refCrumble from '@/assets/brand/ref-crumble.jpg';
import refGanache from '@/assets/brand/ref-ganache.jpg';
import { CupcakeImage } from '@/components/brand/CupcakeImage';
import { ButtonLink, ErrorState, Skeleton } from '@/components/ui';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatMoney } from '@/lib/format';
import { CupcakeCard, CupcakeCardSkeleton } from '../components/CupcakeCard';
import { useCatalog, useCategories, useLiveStock } from '../hooks';

const FEATURED_QUERY = { pageSize: 4, sort: 'name' } as const;

function SectionHeading({
  eyebrow,
  title,
  id,
  action,
}: {
  eyebrow: string;
  title: string;
  id: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
        <h2 id={id} className="font-display text-3xl font-semibold text-fg sm:text-4xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function HomePage() {
  useDocumentTitle(null);
  const featured = useCatalog(FEATURED_QUERY);
  const categories = useCategories();
  useLiveStock();
  const { add, pendingId } = useAddToCart();
  const highlight = featured.data?.data[0];

  return (
    <>
      {/* Hero */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden border-b border-line"
      >
        <div className="pointer-events-none absolute inset-0 bg-radial-glow" aria-hidden="true" />
        <div
          className="pointer-events-none absolute top-1/2 right-0 hidden aspect-[520/238] w-[min(56%,680px)] -translate-y-1/2 lg:block"
          aria-hidden="true"
        >
          <img
            src={heroImage}
            alt=""
            className="size-full [mask-image:linear-gradient(to_right,transparent_0%,black_35%,black_85%,transparent_100%),linear-gradient(to_bottom,transparent_0%,black_22%,black_80%,transparent_100%)] [mask-composite:intersect] object-cover"
          />
          <svg
            viewBox="0 0 200 180"
            className="absolute top-[10%] left-[6%] w-[24%] text-primary/55"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M100 170C40 125 10 92 12 58 14 28 38 10 64 12c16 1 29 10 36 24 7-14 20-23 36-24 26-2 50 16 52 46 2 34-28 67-88 112" />
          </svg>
        </div>

        <div className="relative container-page grid gap-10 py-16 sm:py-20 lg:min-h-[520px] lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="flex max-w-xl flex-col gap-6">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-primary uppercase">
              <Sparkles className="size-4" aria-hidden="true" /> Confeitaria artesanal
            </p>
            <h1
              id="hero-title"
              className="font-display text-5xl leading-[1.05] font-semibold text-balance text-fg sm:text-6xl"
            >
              Cupcakes artesanais para{' '}
              <span className="text-brand-gradient">momentos especiais</span>
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted">
              Sabores únicos, ingredientes selecionados e muito carinho em cada detalhe. Peça para
              entregar ou retire na loja.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                to="/cupcakes"
                size="lg"
                rightIcon={<ArrowRight className="size-5" aria-hidden="true" />}
              >
                Ver cupcakes
              </ButtonLink>
              <ButtonLink to="/categorias" size="lg" variant="secondary">
                Explorar categorias
              </ButtonLink>
            </div>
          </div>

          <div className="relative lg:hidden" aria-hidden="true">
            <img
              src={heroImage}
              alt=""
              className="aspect-[520/238] w-full rounded-3xl border border-line object-cover"
            />
          </div>

          {highlight && (
            <Link
              to={`/cupcakes/${highlight.id}`}
              className="group flex max-w-sm items-center gap-4 self-end justify-self-end rounded-2xl border border-line-strong bg-surface/80 p-3 pr-5 shadow-pop backdrop-blur-md transition-colors hover:border-primary/40 lg:col-start-2 lg:mt-56"
            >
              <CupcakeImage
                src={highlight.imageUrl}
                alt=""
                className="size-16 shrink-0 rounded-xl"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-xs font-medium tracking-wide text-primary uppercase">
                  Destaque do dia
                </span>
                <span className="truncate font-semibold text-fg group-hover:text-primary">
                  {highlight.name}
                </span>
                <span className="text-sm text-muted tabular-nums">
                  {formatMoney(highlight.priceCents)}
                </span>
              </span>
            </Link>
          )}
        </div>
      </section>

      {/* Destaques */}
      <section aria-labelledby="featured-title" className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="Saindo do forno"
          title="Destaques de hoje"
          id="featured-title"
          action={
            <ButtonLink
              to="/cupcakes"
              variant="ghost"
              rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}
            >
              Ver cardápio completo
            </ButtonLink>
          }
        />
        {featured.isError ? (
          <ErrorState
            message="Não foi possível carregar os destaques."
            onRetry={() => void featured.refetch()}
          />
        ) : featured.isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <CupcakeCardSkeleton key={index} />
            ))}
          </div>
        ) : featured.data.data.length ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.data.data.map((cupcake) => (
              <li key={cupcake.id} className="flex">
                <CupcakeCard
                  cupcake={cupcake}
                  onAdd={(item) => void add(item)}
                  adding={pendingId === cupcake.id}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-muted">
            Nossos confeiteiros estão preparando as fornadas de hoje. Volte em breve!
          </p>
        )}
      </section>

      {/* Categorias */}
      <section
        id="categorias"
        aria-labelledby="categories-title"
        className="border-y border-line bg-surface/40"
      >
        <div className="container-page py-16 sm:py-20">
          <SectionHeading eyebrow="Para todos os gostos" title="Categorias" id="categories-title" />
          {categories.isPending ? (
            <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : categories.data?.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.data.map((category, index) => (
                <li key={category.id}>
                  <Link
                    to={`/cupcakes?categoria=${category.slug}`}
                    className="group flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-6 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <span className="font-display text-3xl text-primary/40" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="flex items-center justify-between gap-2 text-xl font-semibold text-fg">
                        {category.name}
                        <ArrowRight
                          className="size-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </span>
                      {category.description && (
                        <span className="text-sm text-muted">{category.description}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Em breve novas categorias.</p>
          )}
        </div>
      </section>

      {/* Sobre */}
      <section aria-labelledby="about-title" className="container-page py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-4" aria-hidden="true">
            {[refGanache, refCrumble, refBerries, refChocolate].map((src, index) => (
              <img
                key={src}
                src={src}
                alt=""
                loading="lazy"
                className={`aspect-square w-full rounded-2xl border border-line object-cover shadow-card ${index % 2 ? 'translate-y-6' : ''}`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Sobre a Cupqy
            </p>
            <h2 id="about-title" className="font-display text-3xl font-semibold sm:text-4xl">
              Uma confeitaria digital, com alma de ateliê
            </h2>
            <p className="leading-relaxed text-muted">
              Cada cupcake é preparado em pequenos lotes, com receitas próprias e ingredientes
              selecionados — do chocolate belga às frutas frescas. A quantidade do dia é limitada
              para garantir que tudo chegue fresquinho até você.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Wheat,
                  title: 'Ingredientes selecionados',
                  text: 'Informações nutricionais e restrições em cada produto.',
                },
                {
                  icon: Bike,
                  title: 'Entrega na sua casa',
                  text: 'Frete calculado pela distância, com prazo estimado.',
                },
                {
                  icon: Store,
                  title: 'Retirada na loja',
                  text: 'Sem frete: busque quando o pedido estiver pronto.',
                },
                {
                  icon: CreditCard,
                  title: 'Pagamento seguro',
                  text: 'Pix ou cartão pelo Mercado Pago.',
                },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium text-fg">{title}</span>
                    <span className="text-sm text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-linear-to-br from-elevated via-surface to-canvas px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-radial-glow" aria-hidden="true" />
          <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Pronto para adoçar o seu dia?
            </h2>
            <p className="text-muted">
              Escolha seus sabores favoritos e acompanhe o pedido em tempo real, do forno até você.
            </p>
            <ButtonLink
              to="/cupcakes"
              size="lg"
              rightIcon={<ArrowRight className="size-5" aria-hidden="true" />}
            >
              Fazer meu pedido
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
