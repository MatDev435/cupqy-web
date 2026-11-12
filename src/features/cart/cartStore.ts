/**
 * Estado do carrinho (US08): mantido no navegador e persistido no localStorage para não se perder
 * se a aba fechar (RNF#01). Os dados de exibição (nome, preço, foto) são apenas um *snapshot* —
 * preço, estoque e subtotal válidos são sempre os devolvidos por POST /cart/validate.
 */

/** Limites da API (cart.service do cupqy-server). */
export const MAX_QUANTITY_PER_ITEM = 50;
export const MAX_CART_ITEMS = 30;
export const CART_STORAGE_KEY = 'cupqy:cart:v1';

export interface CartSnapshot {
  name: string;
  flavor: string | null;
  imageUrl: string | null;
  priceCents: number | null;
}

export interface CartLine {
  cupcakeId: string;
  quantity: number;
  snapshot: CartSnapshot;
}

export interface CartState {
  lines: CartLine[];
}

export type CartAction =
  | { type: 'add'; cupcakeId: string; quantity: number; snapshot: CartSnapshot; max?: number }
  | { type: 'setQuantity'; cupcakeId: string; quantity: number }
  | { type: 'remove'; cupcakeId: string }
  | { type: 'clear' }
  | { type: 'replace'; lines: CartLine[] }
  | { type: 'updateSnapshots'; snapshots: Record<string, Partial<CartSnapshot>> };

const clampQuantity = (quantity: number, max = MAX_QUANTITY_PER_ITEM) =>
  Math.max(1, Math.min(Math.floor(quantity), max, MAX_QUANTITY_PER_ITEM));

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const existing = state.lines.find((line) => line.cupcakeId === action.cupcakeId);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.cupcakeId === action.cupcakeId
              ? {
                  ...line,
                  quantity: clampQuantity(line.quantity + action.quantity, action.max),
                  snapshot: action.snapshot,
                }
              : line,
          ),
        };
      }
      if (state.lines.length >= MAX_CART_ITEMS) return state;
      return {
        lines: [
          ...state.lines,
          {
            cupcakeId: action.cupcakeId,
            quantity: clampQuantity(action.quantity, action.max),
            snapshot: action.snapshot,
          },
        ],
      };
    }
    case 'setQuantity':
      return {
        lines: state.lines.map((line) =>
          line.cupcakeId === action.cupcakeId
            ? { ...line, quantity: clampQuantity(action.quantity) }
            : line,
        ),
      };
    case 'remove':
      return { lines: state.lines.filter((line) => line.cupcakeId !== action.cupcakeId) };
    case 'clear':
      return { lines: [] };
    case 'replace':
      return { lines: sanitizeLines(action.lines) };
    case 'updateSnapshots': {
      let changed = false;
      const lines = state.lines.map((line) => {
        const patch = action.snapshots[line.cupcakeId];
        if (!patch) return line;
        const snapshot = { ...line.snapshot, ...patch };
        if (JSON.stringify(snapshot) === JSON.stringify(line.snapshot)) return line;
        changed = true;
        return { ...line, snapshot };
      });
      return changed ? { lines } : state;
    }
    default:
      return state;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Descarta entradas corrompidas (o localStorage pode ter sido editado manualmente). */
export function sanitizeLines(input: unknown): CartLine[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const lines: CartLine[] = [];
  for (const raw of input) {
    if (!isRecord(raw) || typeof raw.cupcakeId !== 'string' || seen.has(raw.cupcakeId)) continue;
    const quantity = Number(raw.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) continue;
    const snapshot = isRecord(raw.snapshot) ? raw.snapshot : {};
    seen.add(raw.cupcakeId);
    lines.push({
      cupcakeId: raw.cupcakeId,
      quantity: clampQuantity(quantity),
      snapshot: {
        name: typeof snapshot.name === 'string' ? snapshot.name : 'Cupcake',
        flavor: typeof snapshot.flavor === 'string' ? snapshot.flavor : null,
        imageUrl: typeof snapshot.imageUrl === 'string' ? snapshot.imageUrl : null,
        priceCents: typeof snapshot.priceCents === 'number' ? snapshot.priceCents : null,
      },
    });
    if (lines.length >= MAX_CART_ITEMS) break;
  }
  return lines;
}

export function loadCart(storage: Storage | undefined = globalThis.localStorage): CartState {
  try {
    const raw = storage?.getItem(CART_STORAGE_KEY);
    if (!raw) return { lines: [] };
    const parsed: unknown = JSON.parse(raw);
    return { lines: sanitizeLines(isRecord(parsed) ? parsed.lines : undefined) };
  } catch {
    return { lines: [] };
  }
}

export function saveCart(state: CartState, storage: Storage | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(CART_STORAGE_KEY, JSON.stringify({ lines: state.lines }));
  } catch {
    // Armazenamento indisponível (modo privado/cota): o carrinho continua funcionando na sessão.
  }
}

/** Soma apenas para exibição (badge/resumo rápido) — o valor válido vem da API. */
export function estimateSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + (line.snapshot.priceCents ?? 0) * line.quantity, 0);
}

export function totalQuantity(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
