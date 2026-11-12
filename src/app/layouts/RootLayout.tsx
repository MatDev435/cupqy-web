import { Outlet, ScrollRestoration } from 'react-router';
import { ToastProvider } from '@/components/ui';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { CartProvider } from '@/features/cart/CartProvider';
import { NavigationProgress } from '../NavigationProgress';
import { RouteAnnouncer } from '../RouteAnnouncer';

/** Rota raiz: providers que dependem do roteador, restauração de rolagem e anúncio de rotas. */
export function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationProgress />
          <Outlet />
          <ScrollRestoration />
          <RouteAnnouncer />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
