import type { CatalogQuery } from '@/api/contract';
import type { CatalogSort } from '@/api/types';

/**
 * Filtros do catálogo guardados na URL (compartilháveis e preservados ao voltar da página de
 * detalhes — US07 CA#05). Parâmetros em português: busca, categoria, sabor, restricoes, ordem,
 * pagina, esgotados.
 */
export interface CatalogFilters {
  search: string;
  categories: string[];
  flavors: string[];
  dietaryTags: string[];
  sort: CatalogSort;
  page: number;
  includeSoldOut: boolean;
}

export const CATALOG_PAGE_SIZE = 12;

const SORT_PARAM: Record<CatalogSort, string> = {
  name: 'nome',
  price_asc: 'menor-preco',
  price_desc: 'maior-preco',
};
const PARAM_SORT = Object.fromEntries(
  Object.entries(SORT_PARAM).map(([sort, param]) => [param, sort]),
) as Record<string, CatalogSort>;

export const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: 'name', label: 'Nome (A–Z)' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
];

const list = (value: string | null) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export function parseCatalogParams(params: URLSearchParams): CatalogFilters {
  const page = Number(params.get('pagina'));
  return {
    search: params.get('busca') ?? '',
    categories: list(params.get('categoria')),
    flavors: list(params.get('sabor')),
    dietaryTags: list(params.get('restricoes')),
    sort: PARAM_SORT[params.get('ordem') ?? ''] ?? 'name',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    includeSoldOut: params.get('esgotados') === '1',
  };
}

export function toSearchParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('busca', filters.search.trim());
  if (filters.categories.length) params.set('categoria', filters.categories.join(','));
  if (filters.flavors.length) params.set('sabor', filters.flavors.join(','));
  if (filters.dietaryTags.length) params.set('restricoes', filters.dietaryTags.join(','));
  if (filters.sort !== 'name') params.set('ordem', SORT_PARAM[filters.sort]);
  if (filters.page > 1) params.set('pagina', String(filters.page));
  if (filters.includeSoldOut) params.set('esgotados', '1');
  return params;
}

export function toCatalogQuery(filters: CatalogFilters): CatalogQuery {
  return {
    search: filters.search.trim() || undefined,
    category: filters.categories.length ? filters.categories.join(',') : undefined,
    flavor: filters.flavors.length ? filters.flavors.join(',') : undefined,
    dietaryTags: filters.dietaryTags.length ? filters.dietaryTags.join(',') : undefined,
    includeSoldOut: filters.includeSoldOut ? 'true' : undefined,
    sort: filters.sort,
    page: filters.page,
    pageSize: CATALOG_PAGE_SIZE,
  };
}

export function countActiveFilters(filters: CatalogFilters): number {
  return (
    filters.categories.length +
    filters.flavors.length +
    filters.dietaryTags.length +
    (filters.includeSoldOut ? 1 : 0)
  );
}

export function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
