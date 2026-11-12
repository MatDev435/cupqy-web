import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { validateCart } from '@/api/cart';
import { queryKeys } from '@/api/queryKeys';
import type { CartEvaluationItem } from '@/api/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { CartLine } from './cartStore';

/**
 * Avaliação do carrinho NO SERVIDOR (preço atual, cupcake ativo, estoque do dia).
 * Alterações rápidas de quantidade são agrupadas (debounce) antes de consultar a API.
 */
export function useCartValidation(lines: CartLine[]) {
  const key = JSON.stringify(lines.map(({ cupcakeId, quantity }) => ({ cupcakeId, quantity })));
  const debouncedKey = useDebouncedValue(key, 300);
  const items = JSON.parse(debouncedKey) as Array<{ cupcakeId: string; quantity: number }>;

  const query = useQuery({
    queryKey: queryKeys.cart(items),
    queryFn: ({ signal }) => validateCart(items, signal),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  // Enquanto a quantidade local não foi confirmada pelo servidor, o checkout fica bloqueado.
  const syncing = key !== debouncedKey || query.isPlaceholderData || query.isFetching;
  const byId = new Map<string, CartEvaluationItem>(
    (query.data?.items ?? []).map((item) => [item.cupcakeId, item]),
  );

  return { ...query, syncing, byId };
}
