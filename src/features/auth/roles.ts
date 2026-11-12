import type { Permission, Profile, Role } from '@/api/types';

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: 'Cliente',
  BAKER: 'Confeiteiro',
  ADMIN: 'Administrador',
};

export const STAFF_ROLES: Role[] = ['BAKER', 'ADMIN'];

export function hasRole(profile: Profile | null | undefined, roles: Role[]) {
  return Boolean(profile && roles.includes(profile.role));
}

export function hasPermission(profile: Profile | null | undefined, permission: Permission) {
  return Boolean(profile?.permissions.includes(permission));
}

/** Destino padrão após o login, conforme o papel (quando não há redirecionamento explícito). */
export function homeForRole(role: Role | undefined) {
  if (role === 'ADMIN') return '/admin';
  if (role === 'BAKER') return '/cozinha';
  return '/';
}

/** Aceita apenas caminhos internos ("/x"), evitando redirecionamento aberto para outros domínios. */
export function safeRedirect(target: string | null | undefined): string | null {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
    return null;
  }
  return target;
}
