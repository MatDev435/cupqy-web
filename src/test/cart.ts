import { http, HttpResponse } from 'msw';
import type { CartEvaluation, CartItemStatus } from '@/api/types';
import { CART_STORAGE_KEY, type CartLine } from '@/features/cart/cartStore';
import { API } from './msw/server';

export interface FakeProduct {
  id: string;
  name: string;
  priceCents: number;
  available: number;
  status?: CartItemStatus;
}

/** Carrinho salvo no localStorage antes de renderizar. */
export function seedCart(
  lines: Array<{ id: string; name: string; quantity: number; priceCents?: number }>,
) {
  const stored: CartLine[] = lines.map((line) => ({
    cupcakeId: line.id,
    quantity: line.quantity,
    snapshot: {
      name: line.name,
      flavor: 'Chocolate',
      imageUrl: null,
      priceCents: line.priceCents ?? 1000,
    },
  }));
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ lines: stored }));
}

/** Simula POST /cart/validate calculando como o servidor (preço e estoque do "banco"). */
export function cartValidateHandler(products: FakeProduct[], onRequest?: (items: unknown) => void) {
  return http.post(`${API}/cart/validate`, async ({ request }) => {
    const { items } = (await request.json()) as {
      items: Array<{ cupcakeId: string; quantity: number }>;
    };
    onRequest?.(items);
    const evaluated = items.map(({ cupcakeId, quantity }) => {
      const product = products.find((item) => item.id === cupcakeId);
      if (!product || product.status === 'UNAVAILABLE') {
        return {
          cupcakeId,
          name: product?.name ?? null,
          flavor: null,
          imageUrl: null,
          unitPriceCents: null,
          quantity,
          availableQuantity: 0,
          subtotalCents: 0,
          status: 'UNAVAILABLE' as const,
        };
      }
      const status: CartItemStatus =
        product.available <= 0
          ? 'SOLD_OUT'
          : quantity > product.available
            ? 'INSUFFICIENT_STOCK'
            : 'OK';
      return {
        cupcakeId,
        name: product.name,
        flavor: 'Chocolate',
        imageUrl: null,
        unitPriceCents: product.priceCents,
        quantity,
        availableQuantity: product.available,
        subtotalCents: status === 'OK' ? product.priceCents * quantity : 0,
        status,
      };
    });
    const subtotalCents = evaluated.reduce((sum, item) => sum + item.subtotalCents, 0);
    const issues = evaluated
      .filter((item) => item.status !== 'OK')
      .map((item) => ({
        cupcakeId: item.cupcakeId,
        name: item.name,
        status: item.status,
        requestedQuantity: item.quantity,
        availableQuantity: item.availableQuantity,
      }));
    const data: CartEvaluation = {
      stockDate: '2026-11-12',
      items: evaluated,
      totalQuantity: evaluated.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents,
      issues: issues as CartEvaluation['issues'],
      canCheckout: issues.length === 0 && subtotalCents > 0,
    };
    return HttpResponse.json({ data });
  });
}
