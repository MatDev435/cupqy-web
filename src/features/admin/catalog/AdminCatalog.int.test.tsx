import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AdminCupcake } from '@/api/types';
import { mockAuthAs } from '@/test/auth';
import { buildCupcake, page } from '@/test/fixtures';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { AdminCupcakeFormPage } from './AdminCupcakeFormPage';
import { AdminCupcakesPage } from './AdminCupcakesPage';
import { AdminCategoriesPage } from './TaxonomyPage';

function adminCupcake(overrides: Partial<AdminCupcake> = {}): AdminCupcake {
  return {
    ...buildCupcake({ id: 'cup-1', name: 'Red Velvet', priceCents: 1290 }),
    isActive: true,
    imagePath: null,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

const auth = mockAuthAs('ADMIN');

beforeEach(() => {
  server.use(
    http.get(`${API}/admin/categories`, () =>
      HttpResponse.json({
        data: [{ id: 'cat-1', name: 'Clássicos', slug: 'classicos', description: null }],
      }),
    ),
    http.get(`${API}/admin/dietary-tags`, () =>
      HttpResponse.json({ data: [{ id: 'tag-1', name: 'Vegano', slug: 'vegano' }] }),
    ),
  );
});

describe('Cadastro de cupcake (US15)', () => {
  it('valida preço e cria o cupcake em centavos, indo para a edição (foto)', async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/admin/cupcakes`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          { data: adminCupcake({ id: 'new-1', name: 'Pistache' }) },
          { status: 201 },
        );
      }),
      http.get(`${API}/admin/cupcakes/new-1`, () =>
        HttpResponse.json({ data: adminCupcake({ id: 'new-1', name: 'Pistache' }) }),
      ),
    );
    const { router } = renderWithProviders(<AdminCupcakeFormPage />, {
      auth,
      route: '/admin/cupcakes/novo',
      path: '/admin/cupcakes/novo',
      routes: [{ path: '/admin/cupcakes/:cupcakeId', element: <AdminCupcakeFormPage /> }],
    });

    await userEvent.type(screen.getByLabelText(/^Nome/), 'Pistache');
    await userEvent.type(screen.getByLabelText(/^Sabor/), 'Pistache');
    await userEvent.type(screen.getByLabelText(/^Descrição/), 'Massa de pistache.');
    await userEvent.type(screen.getByLabelText(/^Ingredientes/), 'Farinha, pistache.');
    await userEvent.type(screen.getByLabelText(/Preço/), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar cupcake' }));
    expect(
      await screen.findByText('Informe um preço maior que zero (ex.: 12,90).'),
    ).toBeInTheDocument();
    expect(body).toBeUndefined();

    await userEvent.clear(screen.getByLabelText(/Preço/));
    await userEvent.type(screen.getByLabelText(/Preço/), '13,50');
    await waitFor(() => expect(screen.getByLabelText(/^Categoria/)).toHaveTextContent('Clássicos'));
    await userEvent.selectOptions(screen.getByLabelText(/^Categoria/), 'cat-1');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Vegano' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar cupcake' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/cupcakes/new-1'));
    expect(body).toMatchObject({
      name: 'Pistache',
      priceCents: 1350,
      categoryId: 'cat-1',
      dietaryTagIds: ['tag-1'],
      isActive: true,
      nutritionalInfo: null,
    });
    expect(await screen.findByRole('heading', { name: 'Foto' })).toBeInTheDocument();
  });

  it('edita um cupcake existente', async () => {
    let patch: unknown;
    server.use(
      http.get(`${API}/admin/cupcakes/cup-1`, () => HttpResponse.json({ data: adminCupcake() })),
      http.patch(`${API}/admin/cupcakes/cup-1`, async ({ request }) => {
        patch = await request.json();
        return HttpResponse.json({ data: adminCupcake({ priceCents: 1490 }) });
      }),
    );
    renderWithProviders(<AdminCupcakeFormPage />, {
      auth,
      route: '/admin/cupcakes/cup-1',
      path: '/admin/cupcakes/:cupcakeId',
    });
    const price = await screen.findByLabelText(/Preço/);
    expect(price).toHaveValue('12,90');
    await userEvent.clear(price);
    await userEvent.type(price, '14,90');
    await userEvent.click(screen.getByRole('switch', { name: 'Ativo no catálogo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(patch).toMatchObject({ priceCents: 1490, isActive: false }));
    expect(await screen.findByText('Cupcake atualizado.')).toBeInTheDocument();
  });
});

describe('AdminCupcakesPage', () => {
  it('lista ativos e inativos e explica a exclusão lógica (US15 RN#01)', async () => {
    server.use(
      http.get(`${API}/admin/cupcakes`, () =>
        HttpResponse.json(
          page([adminCupcake(), adminCupcake({ id: 'cup-2', name: 'Limão', isActive: false })]),
        ),
      ),
      http.delete(`${API}/admin/cupcakes/cup-1`, () =>
        HttpResponse.json({ data: { id: 'cup-1', deletion: 'soft' } }),
      ),
    );
    renderWithProviders(<AdminCupcakesPage />, { auth });
    const table = await screen.findByRole('table', { name: 'Cupcakes cadastrados' });
    expect(within(table).getByText('Inativo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Excluir Red Velvet' }));
    const dialog = screen.getByRole('dialog', { name: 'Excluir Red Velvet?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Red Velvet foi inativado')).toBeInTheDocument();
  });
});

describe('AdminCategoriesPage', () => {
  it('cria categoria e mostra o motivo quando a remoção é recusada', async () => {
    let created: unknown;
    server.use(
      http.post(`${API}/admin/categories`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json(
          { data: { id: 'cat-2', name: 'Sazonais', slug: 'sazonais', description: null } },
          { status: 201 },
        );
      }),
      http.delete(`${API}/admin/categories/cat-1`, () =>
        HttpResponse.json(
          { error: { code: 'CATEGORY_IN_USE', message: 'Categoria possui cupcakes vinculados.' } },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<AdminCategoriesPage />, { auth });
    await userEvent.click(await screen.findByRole('button', { name: 'Nova categoria' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova categoria' });
    await userEvent.type(within(dialog).getByLabelText(/Nome/), 'Sazonais');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Criar' }));
    await waitFor(() => expect(created).toEqual({ name: 'Sazonais', description: null }));
    expect(await screen.findByText('Categoria criada')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover Clássicos' }));
    await userEvent.click(
      within(screen.getByRole('dialog', { name: /Remover Clássicos/ })).getByRole('button', {
        name: 'Remover',
      }),
    );
    expect(await screen.findByText('Categoria possui cupcakes vinculados.')).toBeInTheDocument();
  });
});
