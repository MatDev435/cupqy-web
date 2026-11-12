import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockAuthAs } from '@/test/auth';
import { buildOrder, page } from '@/test/fixtures';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { OrdersPage } from './OrdersPage';

describe('OrdersPage', () => {
  it('lista pedidos e filtra por escopo', async () => {
    const scopes: Array<string | null> = [];
    server.use(
      http.get(`${API}/orders`, ({ request }) => {
        const url = new URL(request.url);
        scopes.push(url.searchParams.get('scope'));
        const order = buildOrder({
          orderNumber: url.searchParams.get('scope') === 'history' ? 1001 : 1042,
        });
        return HttpResponse.json(page([order]));
      }),
    );
    const { router } = renderWithProviders(<OrdersPage />, {
      auth: mockAuthAs('CUSTOMER'),
      route: '/pedidos',
      path: '/pedidos',
    });
    expect(await screen.findByText('Pedido #1042')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pedido #1042/ })).toHaveAttribute(
      'href',
      '/pedidos/order-1',
    );
    expect(screen.getByText('2× Chocolate Belga')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Finalizados' }));
    expect(await screen.findByText('Pedido #1001')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search).toBe('?escopo=historico'));
    expect(scopes).toEqual(['all', 'history']);
  });

  it('mostra estado vazio', async () => {
    server.use(http.get(`${API}/orders`, () => HttpResponse.json(page([]))));
    renderWithProviders(<OrdersPage />, { auth: mockAuthAs('CUSTOMER') });
    expect(
      await screen.findByRole('heading', { name: 'Você ainda não fez pedidos' }),
    ).toBeInTheDocument();
  });
});
