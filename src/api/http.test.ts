import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { API, server } from '@/test/msw/server';
import { ApiError, buildUrl, configureAuth, getData, isApiError, request } from './http';

function useAuth(overrides: Partial<Parameters<typeof configureAuth>[0]> = {}) {
  const handlers = {
    getAccessToken: vi.fn(async () => 'token-1' as string | null),
    refreshAccessToken: vi.fn(async () => 'token-2' as string | null),
    onUnauthorized: vi.fn(),
    ...overrides,
  };
  configureAuth(handlers);
  return handlers;
}

afterEach(() => {
  configureAuth({
    getAccessToken: async () => null,
    refreshAccessToken: async () => null,
    onUnauthorized: () => {},
  });
});

describe('buildUrl', () => {
  it('monta a URL com prefixo e serializa listas e ignora vazios', () => {
    const url = buildUrl(
      '/cupcakes',
      {
        search: 'choco',
        category: ['classicos', 'frutados'],
        page: 2,
        flavor: [],
        sort: undefined,
      },
      'http://api.test',
    );
    expect(url).toBe(
      'http://api.test/api/v1/cupcakes?search=choco&category=classicos%2Cfrutados&page=2',
    );
  });
});

describe('request', () => {
  it('desembrulha { data } e não envia token em rotas públicas', async () => {
    const auth = useAuth();
    let authorization: string | null = 'unset';
    server.use(
      http.get(`${API}/categories`, ({ request: req }) => {
        authorization = req.headers.get('authorization');
        return HttpResponse.json({ data: [{ id: '1', name: 'Clássicos', slug: 'classicos' }] });
      }),
    );
    const data = await getData<Array<{ name: string }>>('/categories');
    expect(data[0]?.name).toBe('Clássicos');
    expect(authorization).toBeNull();
    expect(auth.getAccessToken).not.toHaveBeenCalled();
  });

  it('envia o Bearer token em rotas autenticadas', async () => {
    useAuth();
    server.use(
      http.get(`${API}/users/me`, ({ request: req }) =>
        HttpResponse.json({ data: { auth: req.headers.get('authorization') } }),
      ),
    );
    await expect(getData('/users/me', { auth: 'required' })).resolves.toEqual({
      auth: 'Bearer token-1',
    });
  });

  it('falha sem sessão quando a rota exige autenticação', async () => {
    useAuth({ getAccessToken: vi.fn(async () => null) });
    await expect(request('/users/me', { auth: 'required' })).rejects.toMatchObject({
      status: 401,
      code: 'MISSING_TOKEN',
    });
  });

  it('renova o token uma vez após 401 e repete a requisição', async () => {
    const auth = useAuth();
    server.use(
      http.get(`${API}/orders`, ({ request: req }) =>
        req.headers.get('authorization') === 'Bearer token-2'
          ? HttpResponse.json({ data: [], meta: { page: 1 } })
          : HttpResponse.json(
              { error: { code: 'INVALID_TOKEN', message: 'Token expirado.' } },
              { status: 401 },
            ),
      ),
    );
    await expect(request('/orders', { auth: 'required' })).resolves.toEqual({
      data: [],
      meta: { page: 1 },
    });
    expect(auth.refreshAccessToken).toHaveBeenCalledOnce();
    expect(auth.onUnauthorized).not.toHaveBeenCalled();
  });

  it('encerra a sessão local se o 401 persistir', async () => {
    const auth = useAuth({ refreshAccessToken: vi.fn(async () => null) });
    server.use(
      http.get(`${API}/orders`, () =>
        HttpResponse.json(
          { error: { code: 'INVALID_TOKEN', message: 'Token inválido.' } },
          { status: 401 },
        ),
      ),
    );
    await expect(request('/orders', { auth: 'required' })).rejects.toBeInstanceOf(ApiError);
    expect(auth.onUnauthorized).toHaveBeenCalledWith('INVALID_TOKEN');
  });

  it('converte o envelope de erro da API em ApiError', async () => {
    server.use(
      http.post(`${API}/orders`, () =>
        HttpResponse.json(
          {
            error: { code: 'CART_UNAVAILABLE', message: 'Itens indisponíveis.', details: [1] },
            requestId: 'req-1',
          },
          { status: 409 },
        ),
      ),
    );
    const error = await request('/orders', { method: 'POST', body: {} }).catch((e) => e);
    expect(isApiError(error, 'CART_UNAVAILABLE')).toBe(true);
    expect(error).toMatchObject({
      status: 409,
      message: 'Itens indisponíveis.',
      requestId: 'req-1',
    });
  });

  it('usa mensagens padrão quando a resposta não segue o envelope', async () => {
    server.use(http.get(`${API}/store`, () => new HttpResponse('Bad gateway', { status: 502 })));
    await expect(request('/store')).rejects.toMatchObject({ code: 'SERVER_ERROR', status: 502 });
  });

  it('trata falhas de rede', async () => {
    server.use(http.get(`${API}/store`, () => HttpResponse.error()));
    await expect(request('/store')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('aplica tempo limite', async () => {
    server.use(
      http.get(`${API}/store`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({ data: {} });
      }),
    );
    await expect(request('/store', { timeoutMs: 20 })).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('retorna undefined em 204', async () => {
    useAuth();
    server.use(
      http.delete(`${API}/users/me/addresses/1`, () => new HttpResponse(null, { status: 204 })),
    );
    await expect(
      request('/users/me/addresses/1', { method: 'DELETE', auth: 'required' }),
    ).resolves.toBeUndefined();
  });
});
