import { describe, expect, it } from 'vitest';
import {
  countActiveFilters,
  parseCatalogParams,
  toCatalogQuery,
  toSearchParams,
  toggle,
} from './catalogParams';

describe('catalogParams', () => {
  it('lê os filtros da URL', () => {
    const filters = parseCatalogParams(
      new URLSearchParams(
        'busca=choco&categoria=classicos,frutados&sabor=Chocolate&restricoes=vegano&ordem=menor-preco&pagina=2&esgotados=1',
      ),
    );
    expect(filters).toEqual({
      search: 'choco',
      categories: ['classicos', 'frutados'],
      flavors: ['Chocolate'],
      dietaryTags: ['vegano'],
      sort: 'price_asc',
      page: 2,
      includeSoldOut: true,
    });
    expect(countActiveFilters(filters)).toBe(5);
  });

  it('usa padrões seguros para valores inválidos', () => {
    const filters = parseCatalogParams(new URLSearchParams('ordem=xyz&pagina=-3'));
    expect(filters.sort).toBe('name');
    expect(filters.page).toBe(1);
  });

  it('serializa de volta omitindo padrões (ida e volta)', () => {
    const query = 'busca=choco&categoria=classicos&ordem=maior-preco&pagina=3';
    const params = toSearchParams(parseCatalogParams(new URLSearchParams(query)));
    expect(params.toString()).toBe('busca=choco&categoria=classicos&ordem=maior-preco&pagina=3');
    expect(toSearchParams(parseCatalogParams(new URLSearchParams())).toString()).toBe('');
  });

  it('converte para a query da API', () => {
    const query = toCatalogQuery(
      parseCatalogParams(new URLSearchParams('sabor=Chocolate,Morango&esgotados=1')),
    );
    expect(query).toMatchObject({
      flavor: 'Chocolate,Morango',
      includeSoldOut: 'true',
      sort: 'name',
      page: 1,
      search: undefined,
    });
  });

  it('alterna valores em listas', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggle(['a', 'b'], 'a')).toEqual(['b']);
  });
});
