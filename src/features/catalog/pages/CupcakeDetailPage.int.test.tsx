import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { buildCupcake } from '@/test/fixtures';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { CupcakeDetailPage } from './CupcakeDetailPage';

function renderDetail(cupcake = buildCupcake()) {
  server.use(http.get(`${API}/cupcakes/${cupcake.id}`, () => HttpResponse.json({ data: cupcake })));
  return renderWithProviders(<CupcakeDetailPage />, {
    route: `/cupcakes/${cupcake.id}`,
    path: '/cupcakes/:cupcakeId',
  });
}

describe('CupcakeDetailPage', () => {
  it('exibe detalhes, ingredientes e tabela nutricional (US07 CA#02)', async () => {
    renderDetail(buildCupcake({ name: 'Red Velvet', weightGrams: 85 }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Red Velvet' }),
    ).toBeInTheDocument();
    expect(screen.getByText('85 g')).toBeInTheDocument();
    expect(screen.getByText('Farinha, cacau, cream cheese.')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Tabela nutricional por unidade' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Valor energético' })).toBeInTheDocument();
  });

  it('limita a quantidade ao estoque do dia (US07 RN#01)', async () => {
    renderDetail(buildCupcake({ name: 'Red Velvet', stock: { available: 2, soldOut: false } }));
    const increase = await screen.findByRole('button', {
      name: 'Aumentar quantidade de Red Velvet',
    });
    await userEvent.click(increase);
    expect(increase).toBeDisabled();
    expect(screen.getByRole('status', { name: 'Quantidade de Red Velvet' })).toHaveTextContent('2');
  });

  it('troca o botão por "Esgotado" sem estoque (US07 RN#02)', async () => {
    renderDetail(buildCupcake({ stock: { available: 0, soldOut: true } }));
    expect(await screen.findAllByText('Esgotado')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Adicionar ao carrinho' })).not.toBeInTheDocument();
  });

  it('avisa quando o servidor indica estoque insuficiente', async () => {
    const cupcake = buildCupcake({ name: 'Red Velvet', stock: { available: 5, soldOut: false } });
    server.use(
      http.post(`${API}/cart/validate`, () =>
        HttpResponse.json({
          data: {
            stockDate: '2026-11-12',
            items: [
              {
                cupcakeId: cupcake.id,
                name: 'Red Velvet',
                flavor: 'Baunilha',
                imageUrl: null,
                unitPriceCents: 1290,
                quantity: 3,
                availableQuantity: 1,
                subtotalCents: 0,
                status: 'INSUFFICIENT_STOCK',
              },
            ],
            totalQuantity: 3,
            subtotalCents: 0,
            issues: [],
            canCheckout: false,
          },
        }),
      ),
    );
    renderDetail(cupcake);
    const increase = await screen.findByRole('button', {
      name: 'Aumentar quantidade de Red Velvet',
    });
    await userEvent.click(increase);
    await userEvent.click(increase);
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar ao carrinho' }));
    expect(await screen.findByText('Adicionamos o que havia em estoque')).toBeInTheDocument();
    expect(screen.getByText('1× Red Velvet')).toBeInTheDocument();
  });

  it('informa cupcake inexistente', async () => {
    server.use(
      http.get(`${API}/cupcakes/inexistente`, () =>
        HttpResponse.json(
          { error: { code: 'CUPCAKE_NOT_FOUND', message: 'Cupcake não encontrado.' } },
          { status: 404 },
        ),
      ),
    );
    renderWithProviders(<CupcakeDetailPage />, {
      route: '/cupcakes/inexistente',
      path: '/cupcakes/:cupcakeId',
    });
    expect(
      await screen.findByRole('heading', { name: 'Cupcake não encontrado' }),
    ).toBeInTheDocument();
  });
});
