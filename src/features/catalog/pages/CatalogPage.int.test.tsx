import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCupcake, page, toSummary } from '@/test/fixtures';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { CatalogPage } from './CatalogPage';

const chocolate = toSummary(buildCupcake({ name: 'Chocolate Belga', flavor: 'Chocolate' }));
const vegan = toSummary(
  buildCupcake({
    name: 'Chocolate Vegano',
    flavor: 'Chocolate',
    dietaryTags: [{ id: 't1', name: 'Vegano', slug: 'vegano' }],
    stock: { available: 2, soldOut: false },
  }),
);

let requests: URL[] = [];

beforeEach(() => {
  requests = [];
  server.use(
    http.get(`${API}/cupcakes`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const search = url.searchParams.get('search')?.toLowerCase();
      const tags = url.searchParams.get('dietaryTags');
      let items = [chocolate, vegan];
      if (search) items = items.filter((item) => item.name.toLowerCase().includes(search));
      if (tags) items = items.filter((item) => item.dietaryTags.some((t) => t.slug === tags));
      return HttpResponse.json(page(items));
    }),
    http.get(`${API}/categories`, () =>
      HttpResponse.json({ data: [{ id: 'c1', name: 'Clássicos', slug: 'classicos' }] }),
    ),
    http.get(`${API}/cupcakes/flavors`, () => HttpResponse.json({ data: ['Chocolate'] })),
    http.get(`${API}/dietary-tags`, () =>
      HttpResponse.json({ data: [{ id: 't1', name: 'Vegano', slug: 'vegano' }] }),
    ),
  );
});

describe('CatalogPage (integração com a camada HTTP)', () => {
  it('lista cupcakes com nome, preço e aviso de últimas unidades', async () => {
    renderWithProviders(<CatalogPage />, { route: '/cupcakes', path: '/cupcakes' });
    expect(await screen.findByRole('heading', { name: 'Chocolate Belga' })).toBeInTheDocument();
    expect(screen.getByText('2 cupcakes encontrados')).toBeInTheDocument();
    const veganCard = screen.getByRole('heading', { name: 'Chocolate Vegano' }).closest('article')!;
    expect(within(veganCard).getByText('Últimas 2 unidades')).toBeInTheDocument();
    expect(within(veganCard).getByText(/R\$\s12,90/)).toBeInTheDocument();
    expect(requests[0]?.searchParams.get('pageSize')).toBe('12');
  });

  it('busca pelo nome atualizando a URL e a API (US06 CA#02)', async () => {
    const { router } = renderWithProviders(<CatalogPage />, {
      route: '/cupcakes',
      path: '/cupcakes',
    });
    await screen.findByRole('heading', { name: 'Chocolate Belga' });
    await userEvent.type(screen.getByRole('searchbox', { name: /Buscar cupcakes/ }), 'vegano');
    await waitFor(() => expect(router.state.location.search).toBe('?busca=vegano'));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Chocolate Belga' })).not.toBeInTheDocument(),
    );
    expect(requests.at(-1)?.searchParams.get('search')).toBe('vegano');
  });

  it('mostra a mensagem amigável quando a busca não encontra nada (US06 CA#03)', async () => {
    renderWithProviders(<CatalogPage />, { route: '/cupcakes?busca=pistache', path: '/cupcakes' });
    expect(
      await screen.findByRole('heading', { name: 'Nenhum cupcake encontrado com esse nome' }),
    ).toBeInTheDocument();
  });

  it('filtra por restrição alimentar e limpa tudo com um clique (US06 CA#04/CA#05)', async () => {
    const { router } = renderWithProviders(<CatalogPage />, {
      route: '/cupcakes',
      path: '/cupcakes',
    });
    await screen.findByRole('heading', { name: 'Chocolate Belga' });
    const sidebar = screen.getByRole('complementary', { name: 'Filtros' });
    await userEvent.click(within(sidebar).getByRole('checkbox', { name: 'Vegano' }));
    await waitFor(() => expect(router.state.location.search).toBe('?restricoes=vegano'));
    await waitFor(() => expect(screen.getByText('1 cupcake encontrado')).toBeInTheDocument());
    expect(requests.at(-1)?.searchParams.get('dietaryTags')).toBe('vegano');

    await userEvent.click(screen.getByRole('button', { name: 'Limpar tudo' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    await waitFor(() => expect(screen.getByText('2 cupcakes encontrados')).toBeInTheDocument());
  });

  it('exibe erro com opção de tentar novamente', async () => {
    server.use(
      http.get(`${API}/cupcakes`, () =>
        HttpResponse.json({ error: { code: 'X', message: 'Falha geral.' } }, { status: 500 }),
      ),
    );
    renderWithProviders(<CatalogPage />, { route: '/cupcakes', path: '/cupcakes' });
    expect(await screen.findByText('Falha geral.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('adiciona ao carrinho após validar com o servidor', async () => {
    server.use(
      http.post(`${API}/cart/validate`, async ({ request }) => {
        const body = (await request.json()) as {
          items: Array<{ cupcakeId: string; quantity: number }>;
        };
        const item = body.items[0]!;
        return HttpResponse.json({
          data: {
            stockDate: '2026-11-12',
            items: [
              {
                cupcakeId: item.cupcakeId,
                name: chocolate.name,
                flavor: chocolate.flavor,
                imageUrl: null,
                unitPriceCents: 1290,
                quantity: item.quantity,
                availableQuantity: 20,
                subtotalCents: 1290 * item.quantity,
                status: 'OK',
              },
            ],
            totalQuantity: item.quantity,
            subtotalCents: 1290 * item.quantity,
            issues: [],
            canCheckout: true,
          },
        });
      }),
    );
    renderWithProviders(<CatalogPage />, { route: '/cupcakes', path: '/cupcakes' });
    await userEvent.click(
      await screen.findByRole('button', { name: 'Adicionar Chocolate Belga ao carrinho' }),
    );
    expect(await screen.findByText('Adicionado ao carrinho')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('cupqy:cart:v1')!).lines[0]).toMatchObject({
      cupcakeId: chocolate.id,
      quantity: 1,
    });
  });
});
