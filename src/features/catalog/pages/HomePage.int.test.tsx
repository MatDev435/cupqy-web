import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { buildCupcake, page, toSummary } from '@/test/fixtures';
import { API, server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/render';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('apresenta destaques e categorias vindos da API', async () => {
    const featured = toSummary(buildCupcake({ name: 'Pistache' }));
    server.use(
      http.get(`${API}/cupcakes`, () => HttpResponse.json(page([featured]))),
      http.get(`${API}/categories`, () =>
        HttpResponse.json({
          data: [{ id: 'c1', name: 'Frutados', slug: 'frutados', description: 'Com frutas.' }],
        }),
      ),
    );
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cupcakes artesanais para momentos especiais',
    );
    expect(await screen.findByRole('heading', { name: 'Pistache' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Frutados/ })).toHaveAttribute(
      'href',
      '/cupcakes?categoria=frutados',
    );
    expect(screen.getByRole('link', { name: 'Ver cupcakes' })).toHaveAttribute('href', '/cupcakes');
  });
});
