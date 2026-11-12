import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthApiError } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { mockAuth } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { ForgotPasswordPage } from './ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  it('solicita o link e exibe confirmação que não revela se o e-mail existe', async () => {
    const auth = mockAuth();
    renderWithProviders(<ForgotPasswordPage />, { auth });
    await userEvent.type(screen.getByLabelText(/E-mail/), 'quem@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
    expect(
      await screen.findByRole('heading', { name: 'Verifique seu e-mail' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Se houver uma conta com esse e-mail/)).toBeInTheDocument();
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('quem@example.com');
  });

  it('informa limite de envio sem revelar dados da conta', async () => {
    const auth = mockAuth({
      requestPasswordReset: vi.fn(async () => {
        throw new AuthApiError('rate limit', 429, 'over_email_send_rate_limit');
      }),
    });
    renderWithProviders(<ForgotPasswordPage />, { auth });
    await userEvent.type(screen.getByLabelText(/E-mail/), 'quem@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Muitos e-mails enviados/);
  });
});
