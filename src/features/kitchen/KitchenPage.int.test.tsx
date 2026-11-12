import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import type { KitchenOrder } from '@/api/types';
import { mockAuthAs } from '@/test/auth';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { KitchenPage } from './KitchenPage';

function kitchenOrder(overrides: Partial<KitchenOrder> = {}): KitchenOrder {
  return {
    id: 'k1',
    orderNumber: 1050,
    status: 'IN_PREPARATION',
    statusLabel: 'Em preparo',
    fulfillmentType: 'PICKUP',
    paidAt: '2026-11-12T10:00:00.000Z',
    elapsedMinutes: 12,
    items: [
      { name: 'Red Velvet', quantity: 3 },
      { name: 'Limão Siciliano', quantity: 1 },
    ],
    totalItems: 4,
    notes: 'Sem granulado',
    customer: { name: 'Maria Souza', phone: '11987654321' },
    delivery: null,
    nextAction: {
      nextStatus: 'AWAITING_PICKUP',
      label: 'Pronto para retirada',
      requiresCourierName: false,
    },
    ...overrides,
  };
}

const deliveryOrder = kitchenOrder({
  id: 'k2',
  orderNumber: 1051,
  status: 'AWAITING_COURIER',
  statusLabel: 'Aguardando entregador',
  fulfillmentType: 'DELIVERY',
  notes: null,
  delivery: {
    address: {
      zipCode: '01310100',
      street: 'Avenida Paulista',
      number: '1000',
      complement: null,
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    },
    courierName: null,
  },
  nextAction: {
    nextStatus: 'OUT_FOR_DELIVERY',
    label: 'Saiu para entrega',
    requiresCourierName: true,
  },
});

let listRequests: URL[] = [];
let advanceBodies: unknown[] = [];

beforeEach(() => {
  listRequests = [];
  advanceBodies = [];
  server.use(
    http.get(`${API}/kitchen/orders`, ({ request }) => {
      listRequests.push(new URL(request.url));
      return HttpResponse.json({
        data: [kitchenOrder(), deliveryOrder],
        meta: {
          summary: {
            IN_PREPARATION: 1,
            AWAITING_COURIER: 1,
            OUT_FOR_DELIVERY: 0,
            AWAITING_PICKUP: 0,
          },
        },
      });
    }),
    http.post(`${API}/kitchen/orders/:id/advance`, async ({ request, params }) => {
      advanceBodies.push({ id: params.id, ...((await request.json()) as object) });
      const base = params.id === 'k1' ? kitchenOrder() : deliveryOrder;
      return HttpResponse.json({
        data: { ...base, status: base.nextAction!.nextStatus, statusLabel: base.nextAction!.label },
      });
    }),
  );
});

function renderKitchen() {
  return renderWithProviders(<KitchenPage />, { auth: mockAuthAs('BAKER') });
}

describe('KitchenPage (US13/US14)', () => {
  it('exibe cartões com número, itens, observações e tipo de entrega', async () => {
    renderKitchen();
    const card = (await screen.findByRole('heading', { name: '#1050' })).closest('article')!;
    expect(within(card).getByText('Red Velvet')).toBeInTheDocument();
    expect(within(card).getByText('3×')).toBeInTheDocument();
    expect(within(card).getByText('Sem granulado')).toBeInTheDocument();
    expect(within(card).getByText('Retirada')).toBeInTheDocument();
    expect(within(card).getByText('12 min')).toBeInTheDocument();
    const delivery = screen.getByRole('heading', { name: '#1051' }).closest('article')!;
    expect(within(delivery).getByText('Delivery')).toBeInTheDocument();
    const stages = screen.getByRole('group', { name: 'Filtrar por etapa' });
    expect(within(stages).getByRole('radio', { name: /Todos/ })).toBeChecked();
    expect(within(stages).getByText('2')).toBeInTheDocument();
  });

  it('avança o pedido com controle otimista (expectedStatus)', async () => {
    renderKitchen();
    const card = (await screen.findByRole('heading', { name: '#1050' })).closest('article')!;
    await userEvent.click(within(card).getByRole('button', { name: 'Pronto para retirada' }));
    await waitFor(() =>
      expect(advanceBodies).toEqual([{ id: 'k1', expectedStatus: 'IN_PREPARATION' }]),
    );
    expect(await screen.findByText('Pedido #1050 atualizado')).toBeInTheDocument();
  });

  it('exige o nome do entregador ao sair para entrega', async () => {
    renderKitchen();
    const card = (await screen.findByRole('heading', { name: '#1051' })).closest('article')!;
    await userEvent.click(within(card).getByRole('button', { name: 'Saiu para entrega' }));
    const dialog = screen.getByRole('dialog', { name: /Saída para entrega/ });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar saída' }));
    expect(within(dialog).getByText('Informe o nome do entregador.')).toBeInTheDocument();
    expect(advanceBodies).toEqual([]);

    await userEvent.type(within(dialog).getByLabelText(/Nome do entregador/), 'João');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar saída' }));
    await waitFor(() =>
      expect(advanceBodies).toEqual([
        { id: 'k2', expectedStatus: 'AWAITING_COURIER', courierName: 'João' },
      ]),
    );
  });

  it('avisa quando outra pessoa já avançou o pedido', async () => {
    server.use(
      http.post(`${API}/kitchen/orders/:id/advance`, () =>
        HttpResponse.json(
          { error: { code: 'ORDER_STATUS_CHANGED', message: 'O status do pedido mudou.' } },
          { status: 409 },
        ),
      ),
    );
    renderKitchen();
    const card = (await screen.findByRole('heading', { name: '#1050' })).closest('article')!;
    await userEvent.click(within(card).getByRole('button', { name: 'Pronto para retirada' }));
    expect(
      await screen.findByText('Este pedido já foi atualizado por outra pessoa'),
    ).toBeInTheDocument();
  });

  it('filtra por etapa e tipo de entrega', async () => {
    renderKitchen();
    await screen.findByRole('heading', { name: '#1050' });
    await userEvent.click(screen.getByRole('radio', { name: /Aguardando entregador/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Delivery' }));
    await waitFor(() => {
      const last = listRequests.at(-1)!;
      expect(last.searchParams.get('status')).toBe('AWAITING_COURIER');
      expect(last.searchParams.get('fulfillmentType')).toBe('DELIVERY');
    });
  });
});
