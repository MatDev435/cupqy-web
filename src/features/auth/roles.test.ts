import { describe, expect, it } from 'vitest';
import { buildProfile } from '@/test/auth';
import { hasPermission, hasRole, homeForRole, safeRedirect } from './roles';

describe('roles', () => {
  it('direciona cada papel para sua área', () => {
    expect(homeForRole('CUSTOMER')).toBe('/');
    expect(homeForRole('BAKER')).toBe('/cozinha');
    expect(homeForRole('ADMIN')).toBe('/admin');
    expect(homeForRole(undefined)).toBe('/');
  });

  it('verifica papéis e permissões vindos da API', () => {
    const baker = buildProfile('BAKER');
    expect(hasRole(baker, ['BAKER', 'ADMIN'])).toBe(true);
    expect(hasRole(baker, ['ADMIN'])).toBe(false);
    expect(hasPermission(baker, 'kitchen:access')).toBe(true);
    expect(hasPermission(baker, 'catalog:manage')).toBe(false);
    expect(hasRole(null, ['ADMIN'])).toBe(false);
  });

  it('aceita apenas redirecionamentos internos', () => {
    expect(safeRedirect('/checkout')).toBe('/checkout');
    expect(safeRedirect('/pedidos/1?pagamento=sucesso')).toBe('/pedidos/1?pagamento=sucesso');
    expect(safeRedirect('https://malicioso.com')).toBeNull();
    expect(safeRedirect('//malicioso.com')).toBeNull();
    expect(safeRedirect('/\\malicioso.com')).toBeNull();
    expect(safeRedirect(null)).toBeNull();
  });
});
