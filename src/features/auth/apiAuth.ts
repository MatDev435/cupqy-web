import { configureAuth } from '@/api/http';
import { supabase } from '@/lib/supabase';
import { emitSessionInvalid } from './authEvents';

/**
 * Conecta a camada HTTP ao Supabase Auth: o access token da sessão vai no cabeçalho
 * Authorization e, em caso de 401, a sessão é renovada uma vez antes de desistir.
 */
export function setupApiAuth() {
  configureAuth({
    async getAccessToken() {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
    async refreshAccessToken() {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) return null;
      return data.session?.access_token ?? null;
    },
    onUnauthorized(code) {
      emitSessionInvalid(code);
    },
  });
}
