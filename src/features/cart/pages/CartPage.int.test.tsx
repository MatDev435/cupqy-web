import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { cartValidateHandler, seedCart } from '@/test/cart';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { CartPage } from './CartPage';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

describe('CartPage', () => {
  it('mostra o estado vazio com atalho para o catálogo (US08 CA#05)', () => {
    renderWithProviders(<CartPage />);
    expect(screen.getByRole('heading', { name: 'Seu carrinho está vazio.' })).toBeInTheDocument();
    expect(screen.getByText('Vamos adicionar alguns cupcakes?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver cupcakes' })).toHaveAttribute('href', '/cupcakes');
    expect(screen.queryByRole('link', { name: /Finalizar compra/ })).not.toBeInTheDocument();
  });

  it('usa os preços do servidor no subtotal e libera o checkout', async () => {
    seedCart([
      { id: A, name: 'Belga', quantity: 2, priceCents: 999 },
      { id: B, name: 'Vegano', quantity: 1, priceCents: 999 },
    ]);
    server.use(
      cartValidateHandler([
        { id: A, name: 'Chocolate Belga', priceCents: 990, available: 10 },
        { id: B, name: 'Chocolate Vegano', priceCents: 1190, available: 10 },
      ]),
    );
    renderWithProviders(<CartPage />);
    expect(await screen.findByRole('link', { name: 'Finalizar compra' })).toHaveAttribute(
      'href',
      '/checkout',
    );
    // 2 × 9,90 + 11,90 = 31,70 (calculado pelo servidor)
    const summary = screen.getByRole('complementary', { name: 'Resumo' });
    expect(within(summary).getByText(/R\$\s31,70/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chocolate Belga' })).toBeInTheDocument();
  });

  it('bloqueia o checkout com estoque insuficiente e permite ajustar (US08 RN#02)', async () => {
    seedCart([{ id: A, name: 'Belga', quantity: 5 }]);
    server.use(
      cartValidateHandler([{ id: A, name: 'Chocolate Belga', priceCents: 990, available: 3 }]),
    );
    renderWithProviders(<CartPage />);
    expect(await screen.findByText('Apenas 3 disponível(is) hoje')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizar compra' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Ajustar para 3' }));
    expect(await screen.findByRole('link', { name: 'Finalizar compra' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Quantidade de Chocolate Belga' })).toHaveTextContent(
      '3',
    );
  });

  it('recalcula ao alterar quantidades e remove itens', async () => {
    const requests: unknown[] = [];
    seedCart([
      { id: A, name: 'Belga', quantity: 1 },
      { id: B, name: 'Vegano', quantity: 1 },
    ]);
    server.use(
      cartValidateHandler(
        [
          { id: A, name: 'Chocolate Belga', priceCents: 1000, available: 10 },
          { id: B, name: 'Chocolate Vegano', priceCents: 500, available: 10 },
        ],
        (items) => requests.push(items),
      ),
    );
    renderWithProviders(<CartPage />);
    await screen.findByRole('link', { name: 'Finalizar compra' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Aumentar quantidade de Chocolate Belga' }),
    );
    await waitFor(() =>
      expect(requests.at(-1)).toEqual([
        { cupcakeId: A, quantity: 2 },
        { cupcakeId: B, quantity: 1 },
      ]),
    );
    const summary = screen.getByRole('complementary', { name: 'Resumo' });
    await waitFor(() => expect(within(summary).getByText(/R\$\s25,00/)).toBeInTheDocument());

    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Chocolate Vegano do carrinho' }),
    );
    expect(screen.queryByRole('heading', { name: 'Chocolate Vegano' })).not.toBeInTheDocument();
    await waitFor(() => expect(within(summary).getByText(/R\$\s20,00/)).toBeInTheDocument());
  });

  it('sinaliza itens esgotados', async () => {
    seedCart([{ id: A, name: 'Belga', quantity: 1 }]);
    server.use(
      cartValidateHandler([{ id: A, name: 'Chocolate Belga', priceCents: 990, available: 0 }]),
    );
    renderWithProviders(<CartPage />);
    expect(await screen.findByText('Esgotado hoje — remova para continuar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizar compra' })).toBeDisabled();
  });

  it('esvazia o carrinho após confirmação', async () => {
    seedCart([{ id: A, name: 'Belga', quantity: 1 }]);
    server.use(
      cartValidateHandler([{ id: A, name: 'Chocolate Belga', priceCents: 990, available: 5 }]),
    );
    renderWithProviders(<CartPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Esvaziar carrinho' }));
    const dialog = screen.getByRole('dialog', { name: 'Esvaziar carrinho?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Esvaziar' }));
    expect(screen.getByRole('heading', { name: 'Seu carrinho está vazio.' })).toBeInTheDocument();
  });
});
