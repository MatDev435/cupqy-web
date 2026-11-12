import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockAuth, mockAuthAs } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { ResetPasswordPage } from './ResetPasswordPage';

const redirect = vi.hoisted(() => ({
  value: { type: null, error: null, errorCode: null, errorDescription: null } as {
    type: string | null;
    error: string | null;
    errorCode: string | null;
    errorDescription: string | null;
  },
}));

vi.mock('@/lib/supabase', () => ({
  get initialAuthRedirect() {
    return redirect.value;
  },
}));

const routes = [{ path: '/entrar', element: <h1>Login</h1> }];

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    redirect.value = { type: null, error: null, errorCode: null, errorDescription: null };
  });

  it('informa link expirado', () => {
    redirect.value = {
      type: null,
      error: 'access_denied',
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    };
    renderWithProviders(<ResetPasswordPage />);
    expect(screen.getByRole('heading', { name: 'Link expirado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toHaveAttribute(
      'href',
      '/esqueci-senha',
    );
  });

  it('considera inválido o acesso direto sem sessão de recuperação', () => {
    renderWithProviders(<ResetPasswordPage />, { auth: mockAuth() });
    expect(screen.getByRole('heading', { name: 'Link inválido' })).toBeInTheDocument();
  });

  it('salva a nova senha, encerra a sessão e volta ao login', async () => {
    redirect.value = { type: 'recovery', error: null, errorCode: null, errorDescription: null };
    const auth = mockAuthAs('CUSTOMER', { passwordRecovery: true });
    renderWithProviders(<ResetPasswordPage />, {
      auth,
      route: '/redefinir-senha',
      path: '/redefinir-senha',
      routes,
    });
    await userEvent.type(screen.getByLabelText(/^Nova senha/), 'novaSenha2026');
    await userEvent.type(screen.getByLabelText(/Confirmação da nova senha/), 'novaSenha2026');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(auth.updatePassword).toHaveBeenCalledWith('novaSenha2026');
    expect(auth.signOut).toHaveBeenCalled();
  });
});
