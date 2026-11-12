import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderDetail } from '@/api/types';
import { mockAuthAs } from '@/test/auth';
import { buildOrder } from '@/test/fixtures';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { OrderDetailPage } from './OrderDetailPage';

const redirectTo = vi.hoisted(() => vi.fn());
vi.mock('@/lib/navigation', () => ({ redirectTo }));

function renderOrder(route = '/pedidos/order-1') {
  return renderWithProviders(<OrderDetailPage />, {
    auth: mockAuthAs('CUSTOMER'),
    route,
    path: '/pedidos/:orderId',
    routes: [{ path: '/carrinho', element: <h1>Carrinho</h1> }],
  });
}

function serveOrder(order: OrderDetail) {
  server.use(http.get(`${API}/orders/order-1`, () => HttpResponse.json({ data: order })));
}

beforeEach(() => redirectTo.mockReset());

describe('OrderDetailPage', () => {
  it('mostra linha do tempo, itens e o entregador quando saiu para entrega (US11)', async () => {
    serveOrder(
      buildOrder({
        status: 'OUT_FOR_DELIVERY',
        delivery: { ...buildOrder().delivery!, courierName: 'João' },
      }),
    );
    renderOrder();
    expect(await screen.findByRole('heading', { name: 'Pedido #1042' })).toBeInTheDocument();
    const timeline = screen.getByRole('list', { name: 'Progresso do pedido' });
    const current = within(timeline)
      .getAllByRole('listitem')
      .find((item) => item.getAttribute('aria-current') === 'step');
    expect(current).toHaveTextContent('Saiu para entrega');
    expect(screen.getByText('João')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Itens do pedido #1042' })).toHaveTextContent(
      'Chocolate Belga',
    );
  });

  it('confirma o pagamento consultando o servidor ao voltar do Checkout Pro', async () => {
    let syncBody: unknown;
    let current = buildOrder({ status: 'AWAITING_PAYMENT' });
    server.use(
      http.get(`${API}/orders/order-1`, () => HttpResponse.json({ data: current })),
      http.post(`${API}/orders/order-1/payment/sync`, async ({ request }) => {
        syncBody = await request.json();
        current = buildOrder({ status: 'IN_PREPARATION' });
        return HttpResponse.json({ data: current });
      }),
    );
    const { router } = renderOrder(
      '/pedidos/order-1?pagamento=sucesso&payment_id=123456789&status=approved',
    );
    expect(await screen.findByText('Pagamento confirmado!')).toBeInTheDocument();
    expect(syncBody).toEqual({ paymentId: '123456789' });
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('nunca considera pago só pelo redirecionamento', async () => {
    serveOrder(buildOrder({ status: 'AWAITING_PAYMENT' }));
    server.use(
      http.post(`${API}/orders/order-1/payment/sync`, () =>
        HttpResponse.json({ data: buildOrder({ status: 'AWAITING_PAYMENT' }) }),
      ),
    );
    renderOrder('/pedidos/order-1?pagamento=sucesso');
    expect(await screen.findByText('Pagamento em processamento')).toBeInTheDocument();
    expect(screen.queryByText('Pagamento confirmado!')).not.toBeInTheDocument();
  });

  it('permite tentar novamente após pagamento recusado', async () => {
    serveOrder(buildOrder({ status: 'AWAITING_PAYMENT' }));
    server.use(
      http.post(`${API}/orders/order-1/payment/sync`, () =>
        HttpResponse.json({ data: buildOrder({ status: 'AWAITING_PAYMENT' }) }),
      ),
      http.post(`${API}/orders/order-1/payment`, () =>
        HttpResponse.json(
          {
            data: {
              ...buildOrder({ status: 'AWAITING_PAYMENT' }),
              checkout: {
                checkoutUrl: 'https://mp.test/novo',
                preferenceId: 'p2',
                sandbox: true,
                expiresAt: '2099-01-01T00:00:00Z',
              },
            },
          },
          { status: 201 },
        ),
      ),
    );
    renderOrder('/pedidos/order-1?pagamento=falha');
    expect(await screen.findByText('Pagamento não aprovado')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar pagar novamente' }));
    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('https://mp.test/novo'));
  });

  it('cancela pedido aguardando pagamento após confirmação', async () => {
    let current = buildOrder({ status: 'AWAITING_PAYMENT' });
    server.use(
      http.get(`${API}/orders/order-1`, () => HttpResponse.json({ data: current })),
      http.post(`${API}/orders/order-1/cancel`, () => {
        current = buildOrder({ status: 'CANCELLED', cancellationReason: 'CUSTOMER_REQUEST' });
        return HttpResponse.json({ data: current });
      }),
    );
    renderOrder();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar pedido' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar o pedido #1042?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar pedido' }));
    expect(await screen.findByText('Cancelado por você.')).toBeInTheDocument();
  });

  it('repete o pedido com preços atuais e avisa sobre indisponíveis (US12)', async () => {
    serveOrder(buildOrder({ status: 'COMPLETED' }));
    server.use(
      http.post(`${API}/orders/order-1/reorder`, () =>
        HttpResponse.json({
          data: {
            sourceOrderId: 'order-1',
            items: [
              {
                cupcakeId: 'cup-1',
                name: 'Chocolate Belga',
                flavor: 'Chocolate',
                imageUrl: null,
                unitPriceCents: 1100,
                previousUnitPriceCents: 1000,
                quantity: 2,
                subtotalCents: 2200,
              },
            ],
            subtotalCents: 2200,
            adjusted: [],
            unavailable: [{ cupcakeId: 'cup-2', name: 'Limão', reason: 'SOLD_OUT' }],
            canCheckout: true,
          },
        }),
      ),
    );
    renderOrder();
    await userEvent.click(await screen.findByRole('button', { name: 'Repetir pedido' }));
    expect(await screen.findByRole('heading', { name: 'Carrinho' })).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem('cupqy:cart:v1')!);
    expect(stored.lines[0]).toMatchObject({
      cupcakeId: 'cup-1',
      quantity: 2,
      snapshot: { priceCents: 1100 },
    });
  });

  it('informa pedido inexistente', async () => {
    server.use(
      http.get(`${API}/orders/order-1`, () =>
        HttpResponse.json({ error: { code: 'ORDER_NOT_FOUND', message: 'x' } }, { status: 404 }),
      ),
    );
    renderOrder();
    expect(
      await screen.findByRole('heading', { name: 'Pedido não encontrado' }),
    ).toBeInTheDocument();
  });
});
