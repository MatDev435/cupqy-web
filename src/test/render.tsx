import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ToastProvider } from '@/components/ui';
import { AuthContext, type AuthContextValue } from '@/features/auth/authContext';
import { CartProvider } from '@/features/cart/CartProvider';
import { mockAuth } from './auth';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface Options {
  /** URL inicial (ex.: "/cupcakes?busca=choco"). */
  route?: string;
  /** Padrão de rota do elemento testado (ex.: "/pedidos/:orderId"). */
  path?: string;
  /** Rotas extras para verificar navegações (ex.: { path: '/carrinho', element: <p>Carrinho</p> }). */
  routes?: RouteObject[];
  auth?: AuthContextValue;
  queryClient?: QueryClient;
}

export function Providers({
  children,
  auth,
  queryClient,
}: {
  children: ReactNode;
  auth: AuthContextValue;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={auth}>
          <CartProvider>{children}</CartProvider>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

/** Renderiza com roteador em memória, TanStack Query, toasts, carrinho e autenticação simulada. */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const {
    route = '/',
    path = '*',
    routes = [],
    auth = mockAuth(),
    queryClient = createTestQueryClient(),
  } = options;
  const router = createMemoryRouter([{ path, element: ui }, ...routes], {
    initialEntries: [route],
  });
  const result = render(
    <Providers auth={auth} queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...result, router, queryClient };
}
