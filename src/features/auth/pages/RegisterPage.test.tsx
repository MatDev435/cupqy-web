import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthApiError } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { RegisterPage } from './RegisterPage';

async function fillForm({ confirm = 'cupcake2026' } = {}) {
  await userEvent.type(screen.getByLabelText(/Nome completo/), 'Maria Souza');
  await userEvent.type(screen.getByLabelText(/E-mail/), 'maria@example.com');
  await userEvent.type(screen.getByLabelText(/Telefone/), '11987654321');
  await userEvent.type(screen.getByLabelText(/^Senha/), 'cupcake2026');
  await userEvent.type(screen.getByLabelText(/Confirmação de senha/), confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
}

describe('RegisterPage', () => {
  it('aplica máscara ao telefone', async () => {
    renderWithProviders(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/Telefone/), '11987654321');
    expect(screen.getByLabelText(/Telefone/)).toHaveValue('(11) 98765-4321');
  });

  it('exibe erro quando as senhas não coincidem (US01 CA#03)', async () => {
    const auth = mockAuth();
    renderWithProviders(<RegisterPage />, { auth });
    await fillForm({ confirm: 'diferente2026' });
    expect(await screen.findByText('As senhas não coincidem.')).toBeInTheDocument();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('pede a confirmação do e-mail quando o Supabase exige', async () => {
    const auth = mockAuth({ signUp: vi.fn(async () => ({ needsConfirmation: true })) });
    renderWithProviders(<RegisterPage />, { auth });
    await fillForm();
    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument();
    expect(auth.signUp).toHaveBeenCalledWith({
      fullName: 'Maria Souza',
      email: 'maria@example.com',
      phone: '(11) 98765-4321',
      password: 'cupcake2026',
    });
  });

  it('entra automaticamente e vai para a home com boas-vindas (US01 CA#04)', async () => {
    renderWithProviders(<RegisterPage />, {
      route: '/cadastro',
      path: '/cadastro',
      routes: [{ path: '/', element: <h1>Home</h1> }],
    });
    await fillForm();
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByText('Boas-vindas, Maria!')).toBeInTheDocument();
  });

  it('exibe erro de senha fraca vindo do Supabase', async () => {
    const auth = mockAuth({
      signUp: vi.fn(async () => {
        throw new AuthApiError('Password is weak', 422, 'weak_password');
      }),
    });
    renderWithProviders(<RegisterPage />, { auth });
    await fillForm();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Senha fraca/);
  });
});
