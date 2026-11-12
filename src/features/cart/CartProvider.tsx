import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { CartContext, type AddResult, type CartContextValue } from './cartContext';
import {
  CART_STORAGE_KEY,
  MAX_CART_ITEMS,
  cartReducer,
  estimateSubtotal,
  loadCart,
  saveCart,
  totalQuantity,
  type CartLine,
  type CartSnapshot,
} from './cartStore';

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, () => loadCart());
  const stateRef = useRef(state);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    stateRef.current = state;
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    saveCart(state);
  }, [state]);

  // Mantém abas abertas sincronizadas.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY) return;
      fromOtherTab.current = true;
      dispatch({ type: 'replace', lines: loadCart().lines });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = useCallback(
    (cupcakeId: string, snapshot: CartSnapshot, quantity = 1, max?: number): AddResult => {
      const current = stateRef.current.lines;
      const exists = current.some((line) => line.cupcakeId === cupcakeId);
      if (!exists && current.length >= MAX_CART_ITEMS) return { ok: false, reason: 'CART_FULL' };
      dispatch({ type: 'add', cupcakeId, snapshot, quantity, max });
      return { ok: true, quantity };
    },
    [],
  );

  const setQuantity = useCallback((cupcakeId: string, quantity: number) => {
    dispatch({ type: 'setQuantity', cupcakeId, quantity });
  }, []);
  const removeItem = useCallback((cupcakeId: string) => {
    dispatch({ type: 'remove', cupcakeId });
  }, []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const replaceLines = useCallback((lines: CartLine[]) => dispatch({ type: 'replace', lines }), []);
  const updateSnapshots = useCallback(
    (snapshots: Record<string, Partial<CartSnapshot>>) =>
      dispatch({ type: 'updateSnapshots', snapshots }),
    [],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      totalQuantity: totalQuantity(state.lines),
      estimatedSubtotalCents: estimateSubtotal(state.lines),
      addItem,
      setQuantity,
      removeItem,
      clear,
      replaceLines,
      updateSnapshots,
      getQuantity: (cupcakeId: string) =>
        state.lines.find((line) => line.cupcakeId === cupcakeId)?.quantity ?? 0,
    }),
    [state.lines, addItem, setQuantity, removeItem, clear, replaceLines, updateSnapshots],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
