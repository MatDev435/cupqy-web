import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  getCupcake,
  listCategories,
  listCupcakes,
  listDietaryTags,
  listFlavors,
} from '@/api/catalog';
import type { CatalogQuery } from '@/api/contract';
import { queryKeys } from '@/api/queryKeys';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

const REFERENCE_DATA_STALE = 10 * 60_000;

export function useCatalog(query: CatalogQuery) {
  return useQuery({
    queryKey: queryKeys.catalog.list(query),
    queryFn: ({ signal }) => listCupcakes(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCupcake(cupcakeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.catalog.detail(cupcakeId ?? ''),
    queryFn: ({ signal }) => getCupcake(cupcakeId!, signal),
    enabled: Boolean(cupcakeId),
    staleTime: 0,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.catalog.categories,
    queryFn: ({ signal }) => listCategories(signal),
    staleTime: REFERENCE_DATA_STALE,
  });
}

export function useFlavors() {
  return useQuery({
    queryKey: queryKeys.catalog.flavors,
    queryFn: ({ signal }) => listFlavors(signal),
    staleTime: REFERENCE_DATA_STALE,
  });
}

export function useDietaryTags() {
  return useQuery({
    queryKey: queryKeys.catalog.dietaryTags,
    queryFn: ({ signal }) => listDietaryTags(signal),
    staleTime: REFERENCE_DATA_STALE,
  });
}

/** "Esgotado" em tempo real (US17 RN#02): mudanças no estoque do dia recarregam o catálogo. */
export function useLiveStock(enabled = true) {
  return useRealtimeInvalidation({
    table: 'daily_stock',
    queryKeys: [queryKeys.catalog.all, ['cart']],
    enabled,
  });
}
