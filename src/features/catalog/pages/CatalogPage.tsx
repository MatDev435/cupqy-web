import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Cookie, Search, SlidersHorizontal, X } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import {
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Select,
} from '@/components/ui';
import { useAddToCart } from '@/features/cart/useAddToCart';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { plural } from '@/lib/format';
import {
  CATALOG_PAGE_SIZE,
  SORT_OPTIONS,
  countActiveFilters,
  parseCatalogParams,
  toCatalogQuery,
  toSearchParams,
  type CatalogFilters,
} from '../catalogParams';
import { CatalogFilterPanel } from '../components/CatalogFilterPanel';
import { CupcakeCard, CupcakeCardSkeleton } from '../components/CupcakeCard';
import { useCatalog, useCategories, useDietaryTags, useFlavors, useLiveStock } from '../hooks';

const EMPTY_FILTERS: CatalogFilters = {
  search: '',
  categories: [],
  flavors: [],
  dietaryTags: [],
  sort: 'name',
  page: 1,
  includeSoldOut: false,
};

/** Catálogo com busca, filtros, ordenação e paginação (US06). */
export function CatalogPage() {
  useDocumentTitle('Cupcakes');
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseCatalogParams(searchParams);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Busca "em tempo real" (US06 CA#02) com debounce para não sobrecarregar a API.
  const [searchText, setSearchText] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchText, 350);

  // Se a URL mudar por fora (voltar/avançar, "Limpar tudo"), o campo acompanha.
  const [urlSearch, setUrlSearch] = useState(filters.search);
  if (filters.search !== urlSearch) {
    setUrlSearch(filters.search);
    if (filters.search !== debouncedSearch.trim()) setSearchText(filters.search);
  }

  const update = (patch: Partial<CatalogFilters>, options: { replace?: boolean } = {}) => {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    setSearchParams(toSearchParams(next), { replace: options.replace });
  };

  useEffect(() => {
    if (debouncedSearch.trim() === filters.search) return;
    const next = { ...filters, search: debouncedSearch, page: 1 };
    setSearchParams(toSearchParams(next), { replace: true });
    // Apenas quando o texto (já com debounce) muda.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [debouncedSearch]);

  // O ícone de busca do cabeçalho leva a /cupcakes?busca= — foca o campo.
  useEffect(() => {
    if (searchParams.has('busca') && !searchParams.get('busca')) searchRef.current?.focus();
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);

  const query = toCatalogQuery(filters);
  const catalog = useCatalog(query);
  const categories = useCategories();
  const flavors = useFlavors();
  const dietaryTags = useDietaryTags();
  useLiveStock();
  const { add, pendingId } = useAddToCart();

  const activeFilters = countActiveFilters(filters);
  const hasCriteria = activeFilters > 0 || Boolean(filters.search);
  const clearAll = () => {
    setSearchText('');
    setSearchParams(toSearchParams(EMPTY_FILTERS));
  };

  const panelProps = {
    filters,
    onChange: (patch: Partial<CatalogFilters>) => update(patch),
    onClear: () => update({ categories: [], flavors: [], dietaryTags: [], includeSoldOut: false }),
    categories: categories.data,
    flavors: flavors.data,
    dietaryTags: dietaryTags.data,
  };

  const total = catalog.data?.meta.total ?? 0;
  const items = catalog.data?.data ?? [];

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        eyebrow="Cardápio do dia"
        title="Nossos cupcakes"
        description="Feitos artesanalmente todos os dias. Disponibilidade sujeita ao estoque do dia."
      />

      <div role="search" className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="catalog-search" className="sr-only">
          Buscar cupcakes pelo nome
        </label>
        <Input
          ref={searchRef}
          id="catalog-search"
          type="search"
          placeholder="Buscar cupcakes…"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          leftIcon={<Search />}
          autoComplete="off"
          className="flex-1"
          rightSlot={
            searchText ? (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-elevated hover:text-fg"
                aria-label="Limpar busca"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : undefined
          }
        />
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="lg:hidden"
            leftIcon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
          >
            Filtros{activeFilters > 0 ? ` (${activeFilters})` : ''}
          </Button>
          <label htmlFor="catalog-sort" className="sr-only">
            Ordenar por
          </label>
          <Select
            id="catalog-sort"
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as CatalogFilters['sort'] })}
            className="min-w-44 flex-1 sm:flex-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="hidden lg:block" aria-label="Filtros">
          <div className="sticky top-24">
            <CatalogFilterPanel {...panelProps} idPrefix="side" />
          </div>
        </aside>

        <section aria-labelledby="catalog-results">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 id="catalog-results" className="text-sm text-muted" aria-live="polite">
              {catalog.isPending
                ? 'Carregando cupcakes…'
                : catalog.isError
                  ? 'Erro ao carregar'
                  : plural(total, 'cupcake encontrado', 'cupcakes encontrados')}
            </h2>
            {hasCriteria && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Limpar tudo
              </Button>
            )}
          </div>

          {catalog.isError ? (
            <ErrorState
              message={getErrorMessage(catalog.error, 'Não foi possível carregar o catálogo.')}
              onRetry={() => void catalog.refetch()}
              retrying={catalog.isFetching}
            />
          ) : catalog.isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <CupcakeCardSkeleton key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Cookie />}
              title={
                filters.search
                  ? 'Nenhum cupcake encontrado com esse nome'
                  : hasCriteria
                    ? 'Nenhum cupcake com esses filtros'
                    : 'Nenhum cupcake disponível hoje'
              }
              description={
                hasCriteria
                  ? 'Tente outro termo ou remova alguns filtros.'
                  : 'Nossos confeiteiros estão preparando novas fornadas. Volte mais tarde!'
              }
              action={
                hasCriteria && (
                  <Button variant="secondary" onClick={clearAll}>
                    Limpar filtros
                  </Button>
                )
              }
            />
          ) : (
            <>
              <ul
                className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${catalog.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}`}
                aria-busy={catalog.isPlaceholderData || undefined}
              >
                {items.map((cupcake) => (
                  <li key={cupcake.id} className="flex">
                    <CupcakeCard
                      cupcake={cupcake}
                      onAdd={(item) => void add(item)}
                      adding={pendingId === cupcake.id}
                    />
                  </li>
                ))}
              </ul>
              <Pagination
                className="mt-10"
                page={filters.page}
                totalPages={catalog.data?.meta.totalPages ?? Math.ceil(total / CATALOG_PAGE_SIZE)}
                onPageChange={(page) => {
                  update({ page });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </section>
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtros">
        <div className="flex flex-col gap-6 p-5">
          <CatalogFilterPanel {...panelProps} idPrefix="drawer" />
          <Button fullWidth onClick={() => setFiltersOpen(false)}>
            Ver {plural(total, 'resultado')}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
