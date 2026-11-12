/**
 * Camada HTTP centralizada para a API Express do Cupqy.
 *
 * - URL base configurável (VITE_API_BASE_URL) + prefixo /api/v1;
 * - serialização de query string (listas como "a,b");
 * - envio do access token do Supabase (Authorization: Bearer);
 * - uma tentativa de renovação do token em caso de 401;
 * - erros padronizados (ApiError) a partir de { error: { code, message, details }, requestId };
 * - tempo limite e tratamento de falhas de rede.
 */
import { env } from '@/lib/env';

export const API_PREFIX = '/api/v1';
const DEFAULT_TIMEOUT_MS = 45_000; // a instância gratuita do Render pode levar ~30s para acordar

export interface ApiErrorInit {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor({ status, code, message, details, requestId }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function isApiError(error: unknown, code?: string | string[]): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  if (!code) return true;
  return Array.isArray(code) ? code.includes(error.code) : error.code === code;
}

/* -------------------------------------------------------------------------- */
/* Autenticação                                                               */
/* -------------------------------------------------------------------------- */

export interface AuthHandlers {
  /** Access token atual (renovado automaticamente pelo supabase-js). */
  getAccessToken: () => Promise<string | null>;
  /** Força a renovação da sessão e devolve o novo token (ou null). */
  refreshAccessToken: () => Promise<string | null>;
  /** Sessão inválida/expirada ou conta encerrada: encerra a sessão local. */
  onUnauthorized: (code: string) => void;
}

let authHandlers: AuthHandlers = {
  getAccessToken: async () => null,
  refreshAccessToken: async () => null,
  onUnauthorized: () => {},
};

export function configureAuth(handlers: AuthHandlers) {
  authHandlers = handlers;
}

/* -------------------------------------------------------------------------- */
/* Requisições                                                                */
/* -------------------------------------------------------------------------- */

type QueryPrimitive = string | number | boolean;
export type QueryValue = QueryPrimitive | null | undefined | readonly QueryPrimitive[];
export type QueryParams = Record<string, QueryValue>;

export function buildUrl(path: string, query?: QueryParams, baseUrl = env.apiBaseUrl): string {
  const url = new URL(`${baseUrl}${API_PREFIX}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        if (value.length) url.searchParams.set(key, value.join(','));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  /**
   * required: exige sessão (falha com 401 sem token);
   * optional: envia o token se houver;
   * none: rota pública.
   */
  auth?: 'required' | 'optional' | 'none';
  signal?: AbortSignal;
  timeoutMs?: number;
}

const FALLBACK_MESSAGES: Record<number, { code: string; message: string }> = {
  401: { code: 'UNAUTHORIZED', message: 'Sua sessão expirou. Entre novamente.' },
  403: { code: 'FORBIDDEN', message: 'Você não tem permissão para acessar este recurso.' },
  404: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
  429: { code: 'RATE_LIMITED', message: 'Muitas requisições. Aguarde alguns instantes.' },
};

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const payload = (body ?? {}) as {
    error?: { code?: string; message?: string; details?: unknown };
    requestId?: string;
  };
  const fallback = FALLBACK_MESSAGES[response.status] ?? {
    code: response.status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED',
    message:
      response.status >= 500
        ? 'O servidor encontrou um problema. Tente novamente em instantes.'
        : 'Não foi possível concluir a operação.',
  };
  return new ApiError({
    status: response.status,
    code: payload.error?.code ?? fallback.code,
    message: payload.error?.message ?? fallback.message,
    details: payload.error?.details,
    requestId: payload.requestId ?? response.headers.get('x-request-id') ?? undefined,
  });
}

async function send(
  url: string,
  method: HttpMethod,
  body: unknown,
  token: string | null,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error; // cancelamento solicitado (ex.: TanStack Query)
    if (timedOut) {
      throw new ApiError({
        status: 0,
        code: 'TIMEOUT',
        message: 'O servidor demorou demais para responder. Tente novamente.',
      });
    }
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    query,
    body,
    auth = 'none',
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  const url = buildUrl(path, query);

  const token = auth === 'none' ? null : await authHandlers.getAccessToken();
  if (auth === 'required' && !token) {
    throw new ApiError({
      status: 401,
      code: 'MISSING_TOKEN',
      message: 'Entre na sua conta para continuar.',
    });
  }

  let response = await send(url, method, body, token, signal, timeoutMs);

  // Token expirado entre a leitura da sessão e a requisição: renova uma vez e repete.
  if (response.status === 401 && token) {
    const refreshed = await authHandlers.refreshAccessToken().catch(() => null);
    if (refreshed && refreshed !== token) {
      response = await send(url, method, body, refreshed, signal, timeoutMs);
    }
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if ((error.status === 401 && token) || error.code === 'ACCOUNT_DELETED') {
      authHandlers.onUnauthorized(error.code);
    }
    throw error;
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Atalhos que já desembrulham o envelope { data } das respostas da API. */
export async function getData<T>(path: string, options?: Omit<RequestOptions, 'method'>) {
  const result = await request<{ data: T }>(path, { ...options, method: 'GET' });
  return result.data;
}

export async function sendData<T>(
  method: Exclude<HttpMethod, 'GET'>,
  path: string,
  options?: Omit<RequestOptions, 'method'>,
) {
  const result = await request<{ data: T } | undefined>(path, { ...options, method });
  return result?.data as T;
}
