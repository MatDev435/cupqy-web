import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { AdminUser } from '@/api/types';
import { buildProfile, mockAuthAs } from '@/test/auth';
import { page } from '@/test/fixtures';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { AdminUsersPage } from './AdminUsersPage';

function user(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: 'u',
    email: 'u@example.com',
    fullName: 'Usuário',
    phone: null,
    role: 'CUSTOMER',
    deleted: false,
    deletedAt: null,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

const self = buildProfile('ADMIN');

describe('AdminUsersPage', () => {
  it('altera papel após confirmação e mostra recusas da API', async () => {
    let body: unknown;
    server.use(
      http.get(`${API}/admin/users`, () =>
        HttpResponse.json(
          page([
            user({ id: self.id, fullName: 'Maria Souza', role: 'ADMIN' }),
            user({ id: 'u2', fullName: 'João Lima', email: 'joao@example.com' }),
          ]),
        ),
      ),
      http.patch(`${API}/admin/users/u2/role`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          data: user({ id: 'u2', fullName: 'João Lima', role: 'BAKER' }),
        });
      }),
    );
    renderWithProviders(<AdminUsersPage />, { auth: mockAuthAs('ADMIN') });

    // O próprio papel não é editável.
    expect(await screen.findByText('Você')).toBeInTheDocument();
    expect(screen.queryByLabelText('Papel de Maria Souza')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Papel de João Lima'), 'BAKER');
    const dialog = screen.getByRole('dialog', { name: 'Alterar papel?' });
    expect(dialog).toHaveTextContent('João Lima passará de Cliente para Confeiteiro.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Alterar papel' }));
    await waitFor(() => expect(body).toEqual({ role: 'BAKER' }));
    expect(await screen.findByText('Papel atualizado')).toBeInTheDocument();
  });

  it('informa quando a alteração deixaria a loja sem administrador', async () => {
    server.use(
      http.get(`${API}/admin/users`, () =>
        HttpResponse.json(page([user({ id: 'u3', fullName: 'Ana Admin', role: 'ADMIN' })])),
      ),
      http.patch(`${API}/admin/users/u3/role`, () =>
        HttpResponse.json(
          {
            error: { code: 'LAST_ADMIN', message: 'A loja precisa de ao menos um administrador.' },
          },
          { status: 422 },
        ),
      ),
    );
    renderWithProviders(<AdminUsersPage />, { auth: mockAuthAs('ADMIN') });
    await userEvent.selectOptions(await screen.findByLabelText('Papel de Ana Admin'), 'CUSTOMER');
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Alterar papel' }),
    );
    expect(
      await screen.findByText('A loja precisa de ao menos um administrador.'),
    ).toBeInTheDocument();
  });
});
