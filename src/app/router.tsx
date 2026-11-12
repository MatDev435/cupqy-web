import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { LoadingState } from '@/components/ui';
import { GuestOnly, RequireAuth, RequireRole } from '@/features/auth/RouteGuards';
import { HomePage } from '@/features/catalog/pages/HomePage';
import { RootLayout } from './layouts/RootLayout';
import { StaffLayout } from './layouts/StaffLayout';
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
            path: 'carrinho',
            ...page(
              () => import('@/features/cart/pages/CartPage'),
              (m) => m.CartPage,
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
            children: [
              {
                path: 'checkout',
                ...page(
                  () => import('@/features/checkout/pages/CheckoutPage'),
                  (m) => m.CheckoutPage,
                ),
              },
              {
                path: 'pedidos',
                ...page(
                  () => import('@/features/orders/pages/OrdersPage'),
                  (m) => m.OrdersPage,
                ),
              },
              {
                path: 'pedidos/:orderId',
                ...page(
                  () => import('@/features/orders/pages/OrderDetailPage'),
                  (m) => m.OrderDetailPage,
                ),
              },
              {
                path: 'conta',
                ...page(
                  () => import('@/features/account/pages/AccountPage'),
                  (m) => m.AccountPage,
                ),
              },
              {
                path: 'conta/enderecos',
                ...page(
                  () => import('@/features/account/pages/AddressesPage'),
                  (m) => m.AddressesPage,
                ),
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        // Painel da cozinha: confeiteiros e administradores (a API também valida o papel).
        path: 'cozinha',
        element: (
          <RequireAuth>
            <RequireRole roles={['BAKER', 'ADMIN']}>
              <StaffLayout area="kitchen" />
            </RequireRole>
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            ...page(
              () => import('@/features/kitchen/KitchenPage'),
              (m) => m.KitchenPage,
            ),
          },
        ],
      },
      {
        // Administração: somente ADMIN (a API valida cada permissão).
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireRole roles={['ADMIN']}>
              <StaffLayout area="admin" />
            </RequireRole>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="cupcakes" replace /> },
          {
            path: 'cupcakes',
            ...page(
              () => import('@/features/admin/catalog/AdminCupcakesPage'),
              (m) => m.AdminCupcakesPage,
            ),
          },
          {
            path: 'cupcakes/novo',
            ...page(
              () => import('@/features/admin/catalog/AdminCupcakeFormPage'),
              (m) => m.AdminCupcakeFormPage,
            ),
          },
          {
            path: 'cupcakes/:cupcakeId',
            ...page(
              () => import('@/features/admin/catalog/AdminCupcakeFormPage'),
              (m) => m.AdminCupcakeFormPage,
            ),
          },
          {
            path: 'pedidos',
            ...page(
              () => import('@/features/admin/orders/AdminOrdersPage'),
              (m) => m.AdminOrdersPage,
            ),
          },
          {
            path: 'pedidos/:orderId',
            ...page(
              () => import('@/features/admin/orders/AdminOrderDetailPage'),
              (m) => m.AdminOrderDetailPage,
            ),
          },
          {
            path: 'usuarios',
            ...page(
              () => import('@/features/admin/users/AdminUsersPage'),
              (m) => m.AdminUsersPage,
            ),
          },
          {
            path: 'estoque',
            ...page(
              () => import('@/features/admin/stock/AdminStockPage'),
              (m) => m.AdminStockPage,
            ),
          },
          {
            path: 'categorias',
            ...page(
              () => import('@/features/admin/catalog/TaxonomyPage'),
              (m) => m.AdminCategoriesPage,
            ),
          },
          {
            path: 'restricoes',
            ...page(
              () => import('@/features/admin/catalog/TaxonomyPage'),
              (m) => m.AdminDietaryTagsPage,
            ),
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
