import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthApiError } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { buildProfile, mockAuth } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { LoginPage } from './LoginPage';

const routes = [
  { path: '/', element: <h1>Home</h1> },
  { path: '/checkout', element: <h1>Checkout</h1> },
  { path: '/admin', element: <h1>Admin</h1> },
];

async function fillAndSubmit(email = 'maria@example.com', password = 'cupcake2026') {
  await userEvent.type(screen.getByLabelText(/E-mail/), email);
  await userEvent.type(screen.getByLabelText(/^Senha/), password);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginPage', () => {
  it('valida campos obrigatórios sem chamar o Supabase', async () => {
    const auth = mockAuth();
    renderWithProviders(<LoginPage />, { route: '/entrar', path: '/entrar', auth, routes });
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/)).toHaveAttribute('aria-invalid', 'true');
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('exibe mensagem genérica para credenciais inválidas (US02 CA#04)', async () => {
    const auth = mockAuth({
      signIn: vi.fn(async () => {
        throw new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
      }),
    });
    renderWithProviders(<LoginPage />, { route: '/entrar', path: '/entrar', auth, routes });
    await fillAndSubmit();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });

  it('oferece reenviar a confirmação quando o e-mail não foi confirmado', async () => {
    const auth = mockAuth({
      signIn: vi.fn(async () => {
        throw new AuthApiError('Email not confirmed', 400, 'email_not_confirmed');
      }),
    });
    renderWithProviders(<LoginPage />, { route: '/entrar', path: '/entrar', auth, routes });
    await fillAndSubmit();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reenviar e-mail de confirmação' }),
    );
    expect(auth.resendConfirmation).toHaveBeenCalledWith('maria@example.com');
  });

  it('volta para o destino solicitado após o login', async () => {
    const auth = mockAuth({ signIn: vi.fn(async () => buildProfile('CUSTOMER')) });
    renderWithProviders(<LoginPage />, {
      route: '/entrar?redirect=%2Fcheckout',
      path: '/entrar',
      auth,
      routes,
    });
    await fillAndSubmit();
    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(auth.signIn).toHaveBeenCalledWith('maria@example.com', 'cupcake2026');
  });

  it('leva o administrador ao painel quando não há destino', async () => {
    const auth = mockAuth({ signIn: vi.fn(async () => buildProfile('ADMIN')) });
    renderWithProviders(<LoginPage />, { route: '/entrar', path: '/entrar', auth, routes });
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument());
  });

  it('ignora redirecionamentos externos', async () => {
    const auth = mockAuth({ signIn: vi.fn(async () => buildProfile('CUSTOMER')) });
    renderWithProviders(<LoginPage />, {
      route: '/entrar?redirect=https%3A%2F%2Fmalicioso.com',
      path: '/entrar',
      auth,
      routes,
    });
    await fillAndSubmit();
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
