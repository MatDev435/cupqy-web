import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockAuth, mockAuthAs } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { GuestOnly, RequireAuth, RequireRole } from './RouteGuards';

describe('RequireAuth', () => {
  it('envia visitantes ao login preservando o destino', () => {
    const { router } = renderWithProviders(
      <RequireAuth>
        <h1>Checkout</h1>
      </RequireAuth>,
      {
        route: '/checkout?x=1',
        path: '/checkout',
        routes: [{ path: '/entrar', element: <h1>Login</h1> }],
      },
    );
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?redirect=%2Fcheckout%3Fx%3D1');
  });

  it('aguarda a restauração da sessão', () => {
    renderWithProviders(
      <RequireAuth>
        <h1>Checkout</h1>
      </RequireAuth>,
      { auth: mockAuth({ status: 'loading' }) },
    );
    expect(screen.getByRole('status')).toHaveTextContent('Verificando sua sessão');
  });

  it('libera usuários autenticados', () => {
    renderWithProviders(
      <RequireAuth>
        <h1>Checkout</h1>
      </RequireAuth>,
      { auth: mockAuthAs('CUSTOMER') },
    );
    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
  });
});

describe('RequireRole', () => {
  const kitchen = (
    <RequireRole roles={['BAKER', 'ADMIN']}>
      <h1>Cozinha</h1>
    </RequireRole>
  );

  it('bloqueia clientes', () => {
    renderWithProviders(kitchen, { auth: mockAuthAs('CUSTOMER') });
    expect(screen.getByRole('heading', { name: 'Acesso restrito' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cozinha' })).not.toBeInTheDocument();
  });

  it.each(['BAKER', 'ADMIN'] as const)('libera %s', (role) => {
    renderWithProviders(kitchen, { auth: mockAuthAs(role) });
    expect(screen.getByRole('heading', { name: 'Cozinha' })).toBeInTheDocument();
  });

  it('mostra erro com nova tentativa se o perfil não carregar', () => {
    renderWithProviders(kitchen, {
      auth: mockAuthAs('ADMIN', { profile: null, profileStatus: 'error' }),
    });
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});

describe('GuestOnly', () => {
  it('redireciona quem já entrou', () => {
    renderWithProviders(
      <GuestOnly>
        <h1>Login</h1>
      </GuestOnly>,
      {
        route: '/entrar',
        path: '/entrar',
        auth: mockAuthAs('CUSTOMER'),
        routes: [{ path: '/', element: <h1>Home</h1> }],
      },
    );
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
