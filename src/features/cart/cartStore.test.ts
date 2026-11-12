import { describe, expect, it } from 'vitest';
import {
  CART_STORAGE_KEY,
  MAX_CART_ITEMS,
  MAX_QUANTITY_PER_ITEM,
  cartReducer,
  estimateSubtotal,
  loadCart,
  sanitizeLines,
  saveCart,
  totalQuantity,
  type CartState,
} from './cartStore';

const snapshot = { name: 'Red Velvet', flavor: 'Baunilha', imageUrl: null, priceCents: 1290 };
const empty: CartState = { lines: [] };

describe('cartReducer', () => {
  it('adiciona e soma quantidades do mesmo cupcake', () => {
    let state = cartReducer(empty, { type: 'add', cupcakeId: 'a', quantity: 2, snapshot });
    state = cartReducer(state, { type: 'add', cupcakeId: 'a', quantity: 1, snapshot });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]?.quantity).toBe(3);
  });

  it('respeita o máximo informado (estoque do dia) e o limite da API', () => {
    let state = cartReducer(empty, { type: 'add', cupcakeId: 'a', quantity: 5, snapshot, max: 4 });
    expect(state.lines[0]?.quantity).toBe(4);
    state = cartReducer(state, { type: 'setQuantity', cupcakeId: 'a', quantity: 999 });
    expect(state.lines[0]?.quantity).toBe(MAX_QUANTITY_PER_ITEM);
    state = cartReducer(state, { type: 'setQuantity', cupcakeId: 'a', quantity: 0 });
    expect(state.lines[0]?.quantity).toBe(1);
  });

  it('limita a quantidade de cupcakes diferentes', () => {
    let state = empty;
    for (let index = 0; index < MAX_CART_ITEMS + 2; index += 1) {
      state = cartReducer(state, { type: 'add', cupcakeId: `c${index}`, quantity: 1, snapshot });
    }
    expect(state.lines).toHaveLength(MAX_CART_ITEMS);
  });

  it('remove itens e limpa o carrinho', () => {
    let state = cartReducer(empty, { type: 'add', cupcakeId: 'a', quantity: 1, snapshot });
    state = cartReducer(state, { type: 'add', cupcakeId: 'b', quantity: 1, snapshot });
    state = cartReducer(state, { type: 'remove', cupcakeId: 'a' });
    expect(state.lines.map((line) => line.cupcakeId)).toEqual(['b']);
    expect(cartReducer(state, { type: 'clear' }).lines).toEqual([]);
  });

  it('atualiza snapshots com dados do servidor sem recriar o estado à toa', () => {
    const state = cartReducer(empty, { type: 'add', cupcakeId: 'a', quantity: 1, snapshot });
    const same = cartReducer(state, {
      type: 'updateSnapshots',
      snapshots: { a: { priceCents: 1290 } },
    });
    expect(same).toBe(state);
    const updated = cartReducer(state, {
      type: 'updateSnapshots',
      snapshots: { a: { priceCents: 1490 } },
    });
    expect(updated.lines[0]?.snapshot.priceCents).toBe(1490);
  });
});

describe('persistência', () => {
  it('salva e restaura do localStorage', () => {
    const state = cartReducer(empty, { type: 'add', cupcakeId: 'a', quantity: 2, snapshot });
    saveCart(state);
    expect(loadCart()).toEqual(state);
  });

  it('ignora dados corrompidos', () => {
    window.localStorage.setItem(CART_STORAGE_KEY, '{nao-e-json');
    expect(loadCart()).toEqual(empty);
    expect(
      sanitizeLines([
        { cupcakeId: 'a', quantity: 2 },
        { cupcakeId: 'a', quantity: 3 },
        { cupcakeId: 'b', quantity: -1 },
        { quantity: 1 },
        'x',
      ]),
    ).toEqual([
      {
        cupcakeId: 'a',
        quantity: 2,
        snapshot: { name: 'Cupcake', flavor: null, imageUrl: null, priceCents: null },
      },
    ]);
  });
});

describe('cálculos de apresentação', () => {
  it('soma quantidades e subtotal estimado', () => {
    const lines = [
      { cupcakeId: 'a', quantity: 2, snapshot },
      { cupcakeId: 'b', quantity: 1, snapshot: { ...snapshot, priceCents: null } },
    ];
    expect(totalQuantity(lines)).toBe(3);
    expect(estimateSubtotal(lines)).toBe(2580);
  });
});
