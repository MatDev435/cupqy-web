import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Permission, Profile, Role } from '@/api/types';

export interface SignUpInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthContextValue {
  /** loading: restaurando a sessão salva; depois authenticated/unauthenticated. */
  status: 'loading' | 'authenticated' | 'unauthenticated';
  session: Session | null;
  user: User | null;
  /** Perfil da API (GET /users/me): fonte confiável do papel. */
  profile: Profile | null;
  profileStatus: 'idle' | 'pending' | 'error' | 'success';
  profileError: unknown;
  role: Role | null;
  isStaff: boolean;
  isAdmin: boolean;
  /** Verdadeiro depois que o link de recuperação de senha foi aberto (evento PASSWORD_RECOVERY). */
  passwordRecovery: boolean;
  hasPermission: (permission: Permission) => boolean;
  signIn: (email: string, password: string) => Promise<Profile | null>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  refreshProfile: () => Promise<unknown>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return context;
}
