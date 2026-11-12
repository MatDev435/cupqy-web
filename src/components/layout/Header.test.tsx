import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY } from '@/features/cart/cartStore';
import { mockAuth, mockAuthAs } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { Header } from './Header';

describe('Header', () => {
  it('mostra navegação principal e acesso ao login para visitantes', () => {
    renderWithProviders(<Header />, { auth: mockAuth() });
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Cupcakes' })).toHaveAttribute(
      'href',
      '/cupcakes',
    );
    expect(within(nav).getByRole('link', { name: 'Meus Pedidos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
    expect(screen.getByRole('link', { name: 'Carrinho vazio' })).toBeInTheDocument();
  });

  it('exibe a quantidade de itens do carrinho', () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        lines: [
          { cupcakeId: 'a', quantity: 2, snapshot: { name: 'A', priceCents: 1000 } },
          { cupcakeId: 'b', quantity: 1, snapshot: { name: 'B', priceCents: 1000 } },
        ],
      }),
    );
    renderWithProviders(<Header />);
    expect(screen.getByRole('link', { name: 'Carrinho, 3 itens' })).toBeInTheDocument();
  });

  it('não mostra áreas internas para clientes', async () => {
    renderWithProviders(<Header />, { auth: mockAuthAs('CUSTOMER') });
    await userEvent.click(screen.getByRole('button', { name: /Maria/ }));
    expect(screen.getByRole('link', { name: 'Minha conta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Painel da cozinha' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administração' })).not.toBeInTheDocument();
  });

  it('mostra cozinha para confeiteiros e administração para admins', async () => {
    renderWithProviders(<Header />, { auth: mockAuthAs('ADMIN') });
    await userEvent.click(screen.getByRole('button', { name: /Maria/ }));
    expect(screen.getByRole('link', { name: 'Painel da cozinha' })).toHaveAttribute(
      'href',
      '/cozinha',
    );
    expect(screen.getByRole('link', { name: 'Administração' })).toHaveAttribute('href', '/admin');
  });

  it('pede confirmação antes de sair (US03 CA#02)', async () => {
    const auth = mockAuthAs('CUSTOMER');
    renderWithProviders(<Header />, { auth });
    await userEvent.click(screen.getByRole('button', { name: /Maria/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    const dialog = screen.getByRole('dialog', { name: 'Sair da conta?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sair' }));
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});
