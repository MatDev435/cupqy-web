import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Address } from '@/api/types';
import { mockAuthAs } from '@/test/auth';
import { cartValidateHandler, seedCart } from '@/test/cart';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { CheckoutPage } from './CheckoutPage';

const redirectTo = vi.hoisted(() => vi.fn());
vi.mock('@/lib/navigation', () => ({ redirectTo }));

const A = '00000000-0000-4000-8000-00000000000a';

const savedAddress: Address = {
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
};

let quoteBodies: unknown[] = [];
let orderBody: unknown;

function useApi({ addresses = [] as Address[] } = {}) {
  server.use(
    cartValidateHandler([{ id: A, name: 'Chocolate Belga', priceCents: 1000, available: 10 }]),
    http.get(`${API}/users/me/addresses`, () => HttpResponse.json({ data: addresses })),
    http.get(`${API}/store`, () =>
      HttpResponse.json({
        data: {
          name: 'Cupqy',
          address: 'Rua Augusta, 1500 - São Paulo',
          timeZone: 'America/Sao_Paulo',
          pickup: { feeCents: 0, estimatedMinutes: 30 },
          delivery: { baseFeeCents: 500, feePerKmCents: 150, maxDistanceKm: 15 },
        },
      }),
    ),
    http.post(`${API}/shipping/quote`, async ({ request }) => {
      const body = (await request.json()) as { fulfillmentType: string };
      quoteBodies.push(body);
      return HttpResponse.json({
        data:
          body.fulfillmentType === 'PICKUP'
            ? {
                fulfillmentType: 'PICKUP',
                feeCents: 0,
                distanceKm: null,
                estimatedMinutes: 30,
                pickupAddress: 'Rua Augusta, 1500',
                deliveryAddress: null,
              }
            : {
                fulfillmentType: 'DELIVERY',
                feeCents: 830,
                distanceKm: 2.2,
                estimatedMinutes: 45,
                pickupAddress: null,
                deliveryAddress: { ...savedAddress },
              },
      });
    }),
    http.post(`${API}/orders`, async ({ request }) => {
      orderBody = await request.json();
      return HttpResponse.json(
        {
          data: {
            id: 'order-1',
            orderNumber: 1042,
            status: 'AWAITING_PAYMENT',
            checkout: {
              preferenceId: 'pref-1',
              checkoutUrl: 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1',
              sandbox: true,
              expiresAt: '2026-11-12T12:30:00Z',
            },
          },
        },
        { status: 201 },
      );
    }),
  );
}

function renderCheckout() {
  return renderWithProviders(<CheckoutPage />, { auth: mockAuthAs('CUSTOMER') });
}

beforeEach(() => {
  quoteBodies = [];
  orderBody = undefined;
  redirectTo.mockReset();
  seedCart([{ id: A, name: 'Chocolate Belga', quantity: 2 }]);
});

describe('CheckoutPage', () => {
  it('finaliza com retirada na loja e redireciona ao Checkout Pro', async () => {
    useApi();
    renderCheckout();
    await userEvent.click(screen.getByRole('radio', { name: /Retirada na loja/ }));
    expect(await screen.findByText('Rua Augusta, 1500 - São Paulo')).toBeInTheDocument();
    const summary = screen.getByRole('complementary', { name: 'Resumo do pedido' });
    await waitFor(() =>
      expect(
        within(summary).getByText(/R\$\s20,00/, { selector: 'dd.text-2xl' }),
      ).toBeInTheDocument(),
    );
    expect(quoteBodies).toContainEqual({ fulfillmentType: 'PICKUP' });

    await userEvent.type(screen.getByLabelText(/observação/), 'Sem granulado');
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento' }));

    await waitFor(() =>
      expect(redirectTo).toHaveBeenCalledWith(
        'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-1',
      ),
    );
    expect(orderBody).toEqual({
      fulfillmentType: 'PICKUP',
      items: [{ cupcakeId: A, quantity: 2 }],
      notes: 'Sem granulado',
    });
    expect(screen.getByText(/Redirecionando para o pagamento/)).toBeInTheDocument();
    expect(screen.getByText(/Ambiente de testes/)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cupqy:cart:v1')!).lines).toEqual([]);
  });

  it('cota o frete com o endereço padrão e mostra o total do servidor', async () => {
    useApi({ addresses: [savedAddress] });
    renderCheckout();
    expect(await screen.findByRole('radio', { name: /Casa/ })).toBeChecked();
    expect(await screen.findByText('45 min')).toBeInTheDocument();
    expect(quoteBodies).toContainEqual({ fulfillmentType: 'DELIVERY', addressId: 'addr-1' });
    const summary = screen.getByRole('complementary', { name: 'Resumo do pedido' });
    // 2 × R$ 10,00 + frete R$ 8,30
    await waitFor(() => expect(within(summary).getByText(/R\$\s28,30/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento' }));
    await waitFor(() => expect(redirectTo).toHaveBeenCalled());
    expect(orderBody).toMatchObject({ fulfillmentType: 'DELIVERY', addressId: 'addr-1' });
  });

  it('usa um novo endereço com opção de salvar', async () => {
    useApi();
    server.use(
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
    renderCheckout();
    const button = screen.getByRole('button', { name: 'Ir para o pagamento' });
    expect(button).toBeDisabled();
    await userEvent.type(await screen.findByLabelText(/CEP/), '01310100');
    await waitFor(() => expect(screen.getByLabelText(/Rua/)).toHaveValue('Avenida Paulista'));
    await userEvent.type(screen.getByLabelText(/Número/), '1000');
    expect(screen.getByRole('checkbox', { name: /Salvar este endereço/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Calcular frete' }));

    expect(await screen.findByText('45 min')).toBeInTheDocument();
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    await waitFor(() => expect(redirectTo).toHaveBeenCalled());
    expect(orderBody).toMatchObject({
      fulfillmentType: 'DELIVERY',
      saveAddress: true,
      address: { zipCode: '01310100', number: '1000', state: 'SP', complement: null },
    });
  });

  it('explica endereço fora da área de entrega', async () => {
    useApi({ addresses: [savedAddress] });
    server.use(
      http.post(`${API}/shipping/quote`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'DELIVERY_OUT_OF_RANGE',
              message: 'Endereço fora da área de entrega (máximo de 15 km).',
            },
          },
          { status: 422 },
        ),
      ),
    );
    renderCheckout();
    expect(await screen.findByText(/fora da área de entrega/)).toBeInTheDocument();
    expect(screen.getByText(/escolher a retirada na loja/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para o pagamento' })).toBeDisabled();
  });

  it('mostra o erro do servidor quando o pedido não pode ser criado', async () => {
    useApi();
    server.use(
      http.post(`${API}/orders`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'TOO_MANY_PENDING_ORDERS',
              message: 'Você tem pedidos aguardando pagamento.',
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderCheckout();
    await userEvent.click(screen.getByRole('radio', { name: /Retirada na loja/ }));
    const button = screen.getByRole('button', { name: 'Ir para o pagamento' });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    expect(await screen.findByText('Você tem pedidos aguardando pagamento.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver pedidos pendentes' })).toBeInTheDocument();
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
