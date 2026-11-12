import type { CupcakeDetail, CupcakeSummary, Page } from '@/api/types';

let sequence = 0;
const uuid = () => {
  sequence += 1;
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
};

export function buildCupcake(overrides: Partial<CupcakeDetail> = {}): CupcakeDetail {
  return {
    id: uuid(),
    name: 'Red Velvet',
    description: 'Massa aveludada com cream cheese.',
    flavor: 'Baunilha',
    priceCents: 1290,
    imageUrl: null,
    category: { id: uuid(), name: 'Clássicos', slug: 'classicos' },
    dietaryTags: [],
    stock: { available: 20, soldOut: false },
    ingredients: 'Farinha, cacau, cream cheese.',
    weightGrams: 80,
    size: 'Médio (7 cm)',
    nutritionalInfo: { servingSizeGrams: 80, calories: 300 },
    ...overrides,
  };
}

export function page<T>(data: T[], overrides: Partial<Page<T>['meta']> = {}): Page<T> {
  return {
    data,
    meta: { page: 1, pageSize: 12, total: data.length, totalPages: 1, ...overrides },
  };
}

export function toSummary(cupcake: CupcakeDetail): CupcakeSummary {
  const { ingredients: _i, weightGrams: _w, size: _s, nutritionalInfo: _n, ...summary } = cupcake;
  return summary;
}
