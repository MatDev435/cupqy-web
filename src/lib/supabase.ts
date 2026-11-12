import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Parâmetros recebidos nos links enviados por e-mail pelo Supabase Auth (confirmação de cadastro e
 * recuperação de senha). Precisam ser lidos ANTES de o supabase-js processar e limpar a URL.
 */
export interface AuthRedirectInfo {
  /** recovery, signup, invite, magiclink, email_change… */
  type: string | null;
  error: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

export function readAuthRedirect(location: Pick<Location, 'hash' | 'search'>): AuthRedirectInfo {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const search = new URLSearchParams(location.search);
  const get = (key: string) => hash.get(key) ?? search.get(key);
  return {
    type: get('type'),
    error: get('error'),
    errorCode: get('error_code'),
    errorDescription: get('error_description'),
  };
}

export const initialAuthRedirect: AuthRedirectInfo = readAuthRedirect(window.location);

/**
 * Cliente do Supabase com a chave PÚBLICA. Responsável por cadastro, login, sessão, renovação de
 * tokens, recuperação de senha, Realtime e upload via URL assinada.
 *
 * Fluxo implícito: os links de e-mail funcionam mesmo se abertos em outro navegador/dispositivo.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storageKey: 'cupqy-auth',
  },
});
