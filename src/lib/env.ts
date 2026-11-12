import { z } from 'zod';

/**
 * Variáveis de ambiente públicas (prefixo VITE_ — embutidas no bundle).
 * Validadas na inicialização: se algo estiver errado, a aplicação exibe uma tela de configuração
 * em vez de falhar silenciosamente.
 */

export interface AppEnv {
  /** URL base da API Express, sem barra final (ex.: http://localhost:3333). */
  apiBaseUrl: string;
  supabaseUrl: string;
  /** Chave pública do Supabase (publishable `sb_publishable_…` ou legada `anon`). */
  supabaseKey: string;
  /** URL pública do front-end para links de e-mail; padrão: a origem atual. */
  appUrl: string | null;
}

const url = (name: string) =>
  z
    .string({ error: `${name} não foi definida.` })
    .trim()
    .min(1, `${name} não foi definida.`)
    .pipe(z.url({ error: `${name} deve ser uma URL válida (http/https).` }))
    .transform((value) => value.replace(/\/+$/, ''));

/** Decodifica o payload de um JWT legado do Supabase (sem validar assinatura). */
function decodeJwtRole(token: string): string | null {
  const [, payload] = token.split('.');
  if (!payload) return null;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.role === 'string' ? json.role : null;
  } catch {
    return null;
  }
}

const supabaseKey = z
  .string({ error: 'VITE_SUPABASE_PUBLISHABLE_KEY não foi definida.' })
  .trim()
  .min(20, 'VITE_SUPABASE_PUBLISHABLE_KEY parece inválida.')
  .refine((key) => !key.startsWith('sb_secret_') && decodeJwtRole(key) !== 'service_role', {
    error:
      'A chave do Supabase informada é SECRETA (service_role/secret). Use somente a chave pública (publishable/anon) no front-end.',
  });

const schema = z.object({
  VITE_API_BASE_URL: url('VITE_API_BASE_URL'),
  VITE_SUPABASE_URL: url('VITE_SUPABASE_URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
  VITE_APP_URL: url('VITE_APP_URL').optional(),
});

export type EnvResult = { ok: true; env: AppEnv } | { ok: false; problems: string[] };

export function parseEnv(source: Record<string, string | boolean | undefined>): EnvResult {
  const value = (key: string) => {
    const raw = source[key];
    return typeof raw === 'string' && raw.trim() !== '' ? raw : undefined;
  };

  const result = schema.safeParse({
    VITE_API_BASE_URL: value('VITE_API_BASE_URL'),
    VITE_SUPABASE_URL: value('VITE_SUPABASE_URL'),
    // Compatibilidade com projetos que ainda usam a chave legada "anon".
    VITE_SUPABASE_PUBLISHABLE_KEY:
      value('VITE_SUPABASE_PUBLISHABLE_KEY') ?? value('VITE_SUPABASE_ANON_KEY'),
    VITE_APP_URL: value('VITE_APP_URL'),
  });

  if (!result.success) {
    return { ok: false, problems: result.error.issues.map((issue) => issue.message) };
  }

  return {
    ok: true,
    env: {
      apiBaseUrl: result.data.VITE_API_BASE_URL,
      supabaseUrl: result.data.VITE_SUPABASE_URL,
      supabaseKey: result.data.VITE_SUPABASE_PUBLISHABLE_KEY,
      appUrl: result.data.VITE_APP_URL ?? null,
    },
  };
}

export const envResult = parseEnv(import.meta.env);

/** Configuração validada. Só deve ser lida depois que `envResult.ok` foi verificado (main.tsx). */
export const env: AppEnv = envResult.ok
  ? envResult.env
  : { apiBaseUrl: '', supabaseUrl: '', supabaseKey: '', appUrl: null };

/** URL pública do front-end usada nos redirecionamentos do Supabase Auth. */
export function appUrl(path = '/'): string {
  const base = env.appUrl ?? window.location.origin;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
