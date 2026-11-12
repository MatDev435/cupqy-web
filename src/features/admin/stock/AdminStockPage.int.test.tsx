import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { StockOverview } from '@/api/types';
import { mockAuthAs } from '@/test/auth';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { AdminStockPage } from './AdminStockPage';

function overview(quantities: Record<string, number | null>): StockOverview {
  const names: Record<string, string> = { a: 'Red Velvet', b: 'Limão', c: 'Pistache' };
  const items = Object.entries(quantities).map(([id, quantity]) => ({
    cupcake: { id, name: names[id]!, flavor: 'Sabor', imageUrl: null, isActive: true },
    quantity: quantity ?? 0,
    isSet: quantity !== null,
    lowStock: quantity !== null && quantity > 0 && quantity < 5,
    soldOut: quantity !== null && quantity <= 0,
    updatedAt: null,
  }));
  return {
    date: '2026-11-12',
    lowStockThreshold: 5,
    summary: {
      activeCupcakes: items.length,
      totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
      lowStock: items.filter((item) => item.lowStock).length,
      soldOut: items.filter((item) => item.soldOut).length,
      notSet: items.filter((item) => !item.isSet).length,
    },
    items,
  };
}

describe('AdminStockPage (US17)', () => {
  it('mostra alertas, salva em lote só o que mudou e zera um item', async () => {
    let state = overview({ a: 20, b: 3, c: null });
    let batch: unknown;
    let single: unknown;
    server.use(
      http.get(`${API}/admin/stock`, () => HttpResponse.json({ data: state })),
      http.put(`${API}/admin/stock`, async ({ request }) => {
        batch = await request.json();
        state = overview({ a: 25, b: 3, c: 10 });
        return HttpResponse.json({ data: state });
      }),
      http.put(`${API}/admin/stock/a`, async ({ request }) => {
        single = await request.json();
        state = overview({ a: 0, b: 3, c: 10 });
        return HttpResponse.json({ data: state });
      }),
    );
    renderWithProviders(<AdminStockPage />, { auth: mockAuthAs('ADMIN') });

    const table = await screen.findByRole('table');
    // CA#03: alerta visual de estoque baixo.
    expect(within(table).getByText('Estoque baixo (< 5)')).toBeInTheDocument();
    expect(within(table).getByText('Não definido')).toBeInTheDocument();

    await userEvent.type(screen.getByRole('spinbutton', { name: /Red Velvet/ }), '25');
    await userEvent.type(screen.getByRole('spinbutton', { name: /Pistache/ }), '10');
    expect(screen.getByText('2 alteração(ões) pendente(s)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() =>
      expect(batch).toMatchObject({
        items: [
          { cupcakeId: 'a', quantity: 25 },
          { cupcakeId: 'c', quantity: 10 },
        ],
      }),
    );
    expect(await screen.findByText('Estoque atualizado.')).toBeInTheDocument();

    // CA#04: zerar manualmente.
    await userEvent.click(screen.getByRole('button', { name: 'Zerar estoque de Red Velvet' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Zerar estoque' }),
    );
    await waitFor(() => expect(single).toMatchObject({ quantity: 0 }));
    expect(await within(screen.getByRole('table')).findByText('Esgotado')).toBeInTheDocument();
  });

  it('impede salvar quantidades inválidas', async () => {
    server.use(
      http.get(`${API}/admin/stock`, () => HttpResponse.json({ data: overview({ a: 1 }) })),
    );
    renderWithProviders(<AdminStockPage />, { auth: mockAuthAs('ADMIN') });
    await userEvent.type(await screen.findByRole('spinbutton', { name: /Red Velvet/ }), '20000');
    expect(screen.getByText('Inteiro de 0 a 10000.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });
});
