import { createBrowserRouter, type RouteObject } from 'react-router';
import { LoadingState } from '@/components/ui';
import { GuestOnly, RequireAuth } from '@/features/auth/RouteGuards';
import { HomePage } from '@/features/catalog/pages/HomePage';
import { RootLayout } from './layouts/RootLayout';
import { StoreLayout } from './layouts/StoreLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';

/** Carregamento sob demanda (code splitting) de cada página. */
const page = <T,>(loader: () => Promise<T>, pick: (module: T) => React.ComponentType) => ({
  lazy: async () => ({ Component: pick(await loader()) }),
});

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <LoadingState className="min-h-dvh" />,
    children: [
      {
        element: <StoreLayout />,
        children: [
          { index: true, element: <HomePage /> },
          {
            path: 'cupcakes',
            ...page(
              () => import('@/features/catalog/pages/CatalogPage'),
              (m) => m.CatalogPage,
            ),
          },
          {
            path: 'cupcakes/:cupcakeId',
            ...page(
              () => import('@/features/catalog/pages/CupcakeDetailPage'),
              (m) => m.CupcakeDetailPage,
            ),
          },
          {
            path: 'categorias',
            ...page(
              () => import('@/features/catalog/pages/CategoriesPage'),
              (m) => m.CategoriesPage,
            ),
          },
          {
            element: <GuestOnly />,
            children: [
              {
                path: 'entrar',
                ...page(
                  () => import('@/features/auth/pages/LoginPage'),
                  (m) => m.LoginPage,
                ),
              },
              {
                path: 'cadastro',
                ...page(
                  () => import('@/features/auth/pages/RegisterPage'),
                  (m) => m.RegisterPage,
                ),
              },
              {
                path: 'esqueci-senha',
                ...page(
                  () => import('@/features/auth/pages/ForgotPasswordPage'),
                  (m) => m.ForgotPasswordPage,
                ),
              },
            ],
          },
          {
            path: 'redefinir-senha',
            ...page(
              () => import('@/features/auth/pages/ResetPasswordPage'),
              (m) => m.ResetPasswordPage,
            ),
          },
          {
            element: <RequireAuth />,
            children: [],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
