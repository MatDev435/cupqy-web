import { createContext, useContext } from 'react';
import type { CartLine, CartSnapshot } from './cartStore';

export type AddResult = { ok: true; quantity: number } | { ok: false; reason: 'CART_FULL' };

export interface CartContextValue {
  lines: CartLine[];
  totalQuantity: number;
  /** Soma local apenas para exibição; o valor válido vem de POST /cart/validate. */
  estimatedSubtotalCents: number;
  addItem: (
    cupcakeId: string,
    snapshot: CartSnapshot,
    quantity?: number,
    max?: number,
  ) => AddResult;
  setQuantity: (cupcakeId: string, quantity: number) => void;
  removeItem: (cupcakeId: string) => void;
  clear: () => void;
  replaceLines: (lines: CartLine[]) => void;
  updateSnapshots: (snapshots: Record<string, Partial<CartSnapshot>>) => void;
  getQuantity: (cupcakeId: string) => number;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de <CartProvider>.');
  return context;
}
