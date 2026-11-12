import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockAuthAs } from '@/test/auth';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { DeleteAccountCard } from './DeleteAccountCard';

async function confirmWith(password: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Excluir conta' }));
  const dialog = screen.getByRole('dialog', { name: 'Excluir sua conta?' });
  await userEvent.type(within(dialog).getByLabelText(/Senha atual/), password);
  await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir definitivamente' }));
  return dialog;
}

describe('DeleteAccountCard (US04)', () => {
  it('exibe a mensagem exata para senha incorreta (CA#03)', async () => {
    server.use(
      http.delete(`${API}/users/me`, () =>
        HttpResponse.json(
          { error: { code: 'INVALID_PASSWORD', message: 'Senha incorreta.' } },
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(<DeleteAccountCard />, { auth: mockAuthAs('CUSTOMER') });
    await confirmWith('errada123');
    expect(
      await screen.findByText('Senha incorreta. Não foi possível prosseguir com a exclusão.'),
    ).toBeInTheDocument();
  });

  it('bloqueia com pedidos em andamento (CA#04)', async () => {
    server.use(
      http.delete(`${API}/users/me`, () =>
        HttpResponse.json(
          { error: { code: 'ACTIVE_ORDERS_PENDING', message: 'Pedidos em andamento.' } },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<DeleteAccountCard />, { auth: mockAuthAs('CUSTOMER') });
    await confirmWith('cupcake2026');
    expect(await screen.findByText('Você tem pedidos em andamento')).toBeInTheDocument();
  });

  it('exclui, encerra a sessão e volta à home (CA#05)', async () => {
    let body: unknown;
    server.use(
      http.delete(`${API}/users/me`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const auth = mockAuthAs('CUSTOMER');
    renderWithProviders(<DeleteAccountCard />, {
      auth,
      route: '/conta',
      path: '/conta',
      routes: [{ path: '/', element: <h1>Home</h1> }],
    });
    await confirmWith('cupcake2026');
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(body).toEqual({ password: 'cupcake2026' });
    expect(auth.signOut).toHaveBeenCalled();
    expect(screen.getByText('Sua conta foi excluída.')).toBeInTheDocument();
  });
});
