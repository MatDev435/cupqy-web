import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { Address } from '@/api/types';
import { mockAuthAs } from '@/test/auth';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { AddressesPage } from './AddressesPage';

function address(overrides: Partial<Address> = {}): Address {
  return {
    id: 'addr-1',
    label: 'Casa',
    zipCode: '01310100',
    street: 'Avenida Paulista',
    number: '1000',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    isDefault: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

describe('AddressesPage', () => {
  it('lista, cadastra e remove endereços', async () => {
    let stored: Address[] = [address()];
    let created: unknown;
    server.use(
      http.get(`${API}/users/me/addresses`, () => HttpResponse.json({ data: stored })),
      http.post(`${API}/users/me/addresses`, async ({ request }) => {
        created = await request.json();
        const item = address({ id: 'addr-2', label: 'Trabalho', isDefault: false, number: '200' });
        stored = [...stored, item];
        return HttpResponse.json({ data: item }, { status: 201 });
      }),
      http.delete(`${API}/users/me/addresses/addr-2`, () => {
        stored = stored.filter((item) => item.id !== 'addr-2');
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${API}/shipping/cep/01310100`, () =>
        HttpResponse.json({
          data: {
            zipCode: '01310100',
            street: 'Avenida Paulista',
            neighborhood: 'Bela Vista',
            city: 'São Paulo',
            state: 'SP',
          },
        }),
      ),
    );

    renderWithProviders(<AddressesPage />, { auth: mockAuthAs('CUSTOMER') });
    expect(await screen.findByRole('heading', { name: 'Casa' })).toBeInTheDocument();
    expect(screen.getByText('Padrão')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Novo endereço' }));
    const dialog = screen.getByRole('dialog', { name: 'Novo endereço' });
    await userEvent.type(within(dialog).getByLabelText(/Identificação/), 'Trabalho');
    await userEvent.type(within(dialog).getByLabelText(/CEP/), '01310100');
    await waitFor(() =>
      expect(within(dialog).getByLabelText(/Rua/)).toHaveValue('Avenida Paulista'),
    );
    await userEvent.type(within(dialog).getByLabelText(/Número/), '200');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar endereço' }));

    expect(await screen.findByRole('heading', { name: 'Trabalho' })).toBeInTheDocument();
    expect(created).toMatchObject({
      label: 'Trabalho',
      zipCode: '01310100',
      number: '200',
      complement: null,
      isDefault: false,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Remover endereço Trabalho' }));
    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Remover endereço?' })).getByRole('button', {
        name: 'Remover',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Trabalho' })).not.toBeInTheDocument(),
    );
  });

  it('mostra estado vazio', async () => {
    server.use(http.get(`${API}/users/me/addresses`, () => HttpResponse.json({ data: [] })));
    renderWithProviders(<AddressesPage />, { auth: mockAuthAs('CUSTOMER') });
    expect(
      await screen.findByRole('heading', { name: 'Nenhum endereço salvo' }),
    ).toBeInTheDocument();
  });
});
