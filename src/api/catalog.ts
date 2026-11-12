import type { CatalogQuery } from './contract';
import { getData, request } from './http';
import type { Category, CupcakeDetail, CupcakeSummary, DietaryTag, Page } from './types';

/** Catálogo público: por padrão, só cupcakes ativos e com estoque hoje (US06 RN#01). */
export function listCupcakes(query: CatalogQuery = {}, signal?: AbortSignal) {
  return request<Page<CupcakeSummary>>('/cupcakes', { query, signal });
}

export function getCupcake(cupcakeId: string, signal?: AbortSignal) {
  return getData<CupcakeDetail>(`/cupcakes/${encodeURIComponent(cupcakeId)}`, { signal });
}

export function listFlavors(signal?: AbortSignal) {
  return getData<string[]>('/cupcakes/flavors', { signal });
}

export function listCategories(signal?: AbortSignal) {
  return getData<Category[]>('/categories', { signal });
}

export function listDietaryTags(signal?: AbortSignal) {
  return getData<DietaryTag[]>('/dietary-tags', { signal });
}
