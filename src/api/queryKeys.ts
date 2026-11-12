/**
 * Chaves do TanStack Query centralizadas — usadas para cache e invalidação (inclusive pelos
 * eventos do Supabase Realtime).
 */
export const queryKeys = {
  me: ['me'] as const,
  addresses: ['me', 'addresses'] as const,

  catalog: {
    all: ['catalog'] as const,
    list: (params: object) => ['catalog', 'list', params] as const,
    detail: (cupcakeId: string) => ['catalog', 'detail', cupcakeId] as const,
    flavors: ['catalog', 'flavors'] as const,
    categories: ['catalog', 'categories'] as const,
    dietaryTags: ['catalog', 'dietary-tags'] as const,
  },

  store: ['store'] as const,
  cep: (cep: string) => ['cep', cep] as const,
  cart: (items: object) => ['cart', 'validate', items] as const,

  orders: {
    all: ['orders'] as const,
    list: (params: object) => ['orders', 'list', params] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  },

  kitchen: {
    all: ['kitchen'] as const,
    list: (params: object) => ['kitchen', 'list', params] as const,
  },

  admin: {
    all: ['admin'] as const,
    cupcakes: (params: object) => ['admin', 'cupcakes', params] as const,
    cupcake: (cupcakeId: string) => ['admin', 'cupcake', cupcakeId] as const,
    categories: ['admin', 'categories'] as const,
    dietaryTags: ['admin', 'dietary-tags'] as const,
    stock: (date: string | undefined) => ['admin', 'stock', date ?? 'today'] as const,
    orders: (params: object) => ['admin', 'orders', params] as const,
    order: (orderId: string) => ['admin', 'order', orderId] as const,
    dashboard: (period: string) => ['admin', 'dashboard', period] as const,
    users: (params: object) => ['admin', 'users', params] as const,
  },
};
