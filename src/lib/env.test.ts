import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const valid = {
  VITE_API_BASE_URL: 'http://localhost:3333/',
  VITE_SUPABASE_URL: 'https://abc.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abcdefghijklmnopqrstuvwxyz',
};

function jwt(payload: object) {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature-signature`;
}

describe('parseEnv', () => {
  it('normaliza URLs sem barra final', () => {
    const result = parseEnv(valid);
    expect(result).toEqual({
      ok: true,
      env: {
        apiBaseUrl: 'http://localhost:3333',
        supabaseUrl: 'https://abc.supabase.co',
        supabaseKey: valid.VITE_SUPABASE_PUBLISHABLE_KEY,
        appUrl: null,
      },
    });
  });

  it('aceita a chave legada anon como alternativa', () => {
    const anon = jwt({ role: 'anon', iss: 'supabase' });
    const result = parseEnv({
      ...valid,
      VITE_SUPABASE_PUBLISHABLE_KEY: undefined,
      VITE_SUPABASE_ANON_KEY: anon,
    });
    expect(result.ok && result.env.supabaseKey).toBe(anon);
  });

  it('lista variáveis ausentes ou inválidas', () => {
    const result = parseEnv({ VITE_API_BASE_URL: 'não é url' });
    const problems = result.ok ? '' : result.problems.join(' ');
    expect(result.ok).toBe(false);
    expect(problems).toMatch(/VITE_API_BASE_URL deve ser uma URL válida/);
    expect(problems).toMatch(/VITE_SUPABASE_URL não foi definida/);
  });

  it.each([
    ['secret key nova', 'sb_secret_abcdefghijklmnopqrstuvwxyz'],
    ['service_role legada', jwt({ role: 'service_role' })],
  ])('recusa chave secreta (%s)', (_label, key) => {
    const result = parseEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: key });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.problems[0]).toMatch(/SECRETA/);
  });
});
