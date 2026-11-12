import { vi } from 'vitest';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile, Role } from '@/api/types';
import type { AuthContextValue } from '@/features/auth/authContext';

const PERMISSIONS: Record<Role, Profile['permissions']> = {
  CUSTOMER: ['profile:manage-own', 'orders:create', 'orders:read-own'],
  BAKER: [
    'profile:manage-own',
    'orders:create',
    'orders:read-own',
    'orders:read-any',
    'kitchen:access',
  ],
  ADMIN: [
    'profile:manage-own',
    'orders:create',
    'orders:read-own',
    'orders:read-any',
    'kitchen:access',
    'catalog:manage',
    'stock:manage',
    'orders:manage',
    'finance:read',
    'users:manage',
  ],
};

export function buildProfile(role: Role = 'CUSTOMER', overrides: Partial<Profile> = {}): Profile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'maria@example.com',
    fullName: 'Maria Souza',
    phone: '11987654321',
    role,
    permissions: PERMISSIONS[role],
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  };
}

/** Contexto de autenticação simulado (visitante por padrão). */
export function mockAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: 'unauthenticated',
    session: null,
    user: null,
    profile: null,
    profileStatus: 'idle',
    profileError: null,
    role: null,
    isStaff: false,
    isAdmin: false,
    passwordRecovery: false,
    hasPermission: () => false,
    signIn: vi.fn(async () => null),
    signUp: vi.fn(async () => ({ needsConfirmation: false })),
    signOut: vi.fn(async () => {}),
    requestPasswordReset: vi.fn(async () => {}),
    updatePassword: vi.fn(async () => {}),
    resendConfirmation: vi.fn(async () => {}),
    refreshProfile: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function mockAuthAs(role: Role, overrides: Partial<AuthContextValue> = {}) {
  const profile = buildProfile(role);
  const user = { id: profile.id, email: profile.email } as User;
  return mockAuth({
    status: 'authenticated',
    session: { access_token: 'token', user } as Session,
    user,
    profile,
    profileStatus: 'success',
    role,
    isStaff: role !== 'CUSTOMER',
    isAdmin: role === 'ADMIN',
    hasPermission: (permission) => profile.permissions.includes(permission),
    ...overrides,
  });
}
