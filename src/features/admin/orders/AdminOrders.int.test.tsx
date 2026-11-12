import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { AdminOrderSummary } from '@/api/types';
import { mockAuthAs } from '@/test/auth';
import { buildOrder, page } from '@/test/fixtures';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { AdminOrderDetailPage } from './AdminOrderDetailPage';
import { AdminOrdersPage } from './AdminOrdersPage';

const auth = mockAuthAs('ADMIN');

function summary(overrides: Partial<AdminOrderSummary> = {}): AdminOrderSummary {
  const { items: _items, ...order } = buildOrder();
  return {
    ...order,
    items: [{ name: 'Chocolate Belga', quantity: 2 }],
    customer: { name: 'Maria Souza', email: 'maria@example.com' },
    ...overrides,
  };
}

describe('AdminOrdersPage', () => {
  it('lista pedidos com cliente e aplica filtros na API', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(`${API}/admin/orders`, ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(page([summary()]));
      }),
    );
    renderWithProviders(<AdminOrdersPage />, {
      auth,
      route: '/admin/pedidos',
      path: '/admin/pedidos',
    });
    const table = await screen.findByRole('table', { name: 'Pedidos da loja' });
    expect(within(table).getByRole('link', { name: '#1042' })).toHaveAttribute(
      'href',
      '/admin/pedidos/order-1',
    );
    expect(within(table).getByText('maria@example.com')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'IN_PREPARATION');
    await userEvent.selectOptions(screen.getByLabelText('Tipo de entrega'), 'PICKUP');
    await waitFor(() => {
      const last = requests.at(-1)!;
      expect(last.searchParams.get('status')).toBe('IN_PREPARATION');
      expect(last.searchParams.get('fulfillmentType')).toBe('PICKUP');
    });
  });
});

describe('AdminOrderDetailPage', () => {
  it('cancela pedido pago informando o reembolso', async () => {
    let current = buildOrder({ status: 'IN_PREPARATION' });
    let body: unknown;
    server.use(
      http.get(`${API}/admin/orders/order-1`, () => HttpResponse.json({ data: current })),
      http.post(`${API}/admin/orders/order-1/cancel`, async ({ request }) => {
        body = await request.json();
        current = buildOrder({ status: 'CANCELLED', cancellationReason: 'ADMIN_REQUEST' });
        return HttpResponse.json({ data: current });
      }),
    );
    renderWithProviders(<AdminOrderDetailPage />, {
      auth,
      route: '/admin/pedidos/order-1',
      path: '/admin/pedidos/:orderId',
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar pedido' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar o pedido #1042?' });
    expect(dialog).toHaveTextContent(/será reembolsado/);
    await userEvent.type(within(dialog).getByLabelText(/Motivo/), 'Falta de ingrediente');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar cancelamento' }));
    await waitFor(() => expect(body).toEqual({ reason: 'Falta de ingrediente' }));
    expect(await screen.findByText('Cancelado pela loja.')).toBeInTheDocument();
    expect(screen.getByText(/reembolso total foi solicitado/)).toBeInTheDocument();
  });
});
