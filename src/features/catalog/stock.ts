import type { Stock } from '@/api/types';

/** Abaixo disto o card exibe "Últimas unidades" (apenas apresentação). */
export const LOW_STOCK_DISPLAY = 5;

export type StockLevel = 'sold-out' | 'low' | 'available';

export function stockLevel(stock: Stock): StockLevel {
  if (stock.soldOut || stock.available <= 0) return 'sold-out';
  if (stock.available <= LOW_STOCK_DISPLAY) return 'low';
  return 'available';
}

export function stockLabel(stock: Stock): string {
  const level = stockLevel(stock);
  if (level === 'sold-out') return 'Esgotado';
  if (level === 'low') {
    return stock.available === 1 ? 'Última unidade' : `Últimas ${stock.available} unidades`;
  }
  return `${stock.available} disponíveis hoje`;
}
