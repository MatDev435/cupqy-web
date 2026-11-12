import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { getMe } from '@/api/profile';
import { queryKeys } from '@/api/queryKeys';
import type { Permission } from '@/api/types';
import { useToast } from '@/components/ui';
import { appUrl } from '@/lib/env';
import { onlyDigits } from '@/lib/format';
import { initialAuthRedirect, supabase } from '@/lib/supabase';
import { AuthContext, type AuthContextValue, type SignUpInput } from './authContext';
import { onSessionInvalid } from './authEvents';
import { STAFF_ROLES } from './roles';

/**
 * Estado de autenticação da aplicação, sobre o Supabase Auth.
 * O supabase-js persiste a sessão, renova o token automaticamente e a recupera ao recarregar.
 * O papel do usuário vem SEMPRE da API (GET /users/me) — nunca dos metadados do Supabase.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(
    initialAuthRedirect.type === 'recovery' && !initialAuthRedirect.error,
  );

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    // Não chamar outros métodos do supabase dentro do callback (recomendação do SDK).
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setRestoring(false);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        // Remove dados de usuário do cache: telas restritas não podem ser revistas ao voltar.
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  // Confirmação de cadastro pelo link do e-mail.
  useEffect(() => {
    if (initialAuthRedirect.type === 'signup' && !initialAuthRedirect.error) {
      toast({ tone: 'success', title: 'E-mail confirmado!', description: 'Boas-vindas ao Cupqy.' });
    }
  }, [toast]);

  // A API rejeitou o token (sessão revogada/expirada) ou a conta foi encerrada.
  useEffect(
    () =>
      onSessionInvalid((code) => {
        void supabase.auth.signOut({ scope: 'local' });
        toast({
          tone: 'warning',
          title: code === 'ACCOUNT_DELETED' ? 'Conta encerrada' : 'Sessão encerrada',
          description:
            code === 'ACCOUNT_DELETED'
              ? 'Esta conta foi encerrada.'
              : 'Sua sessão expirou. Entre novamente para continuar.',
        });
      }),
    [toast],
  );

  const userId = session?.user.id ?? null;

  const profileQuery = useQuery({
    queryKey: [...queryKeys.me, userId],
    queryFn: ({ signal }) => getMe(signal),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });

  const profile = userId ? (profileQuery.data ?? null) : null;

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
      try {
        return await queryClient.fetchQuery({
          queryKey: [...queryKeys.me, data.user.id],
          queryFn: ({ signal }) => getMe(signal),
        });
      } catch {
        return null; // A sessão é válida mesmo que a API esteja indisponível no momento.
      }
    },
    [queryClient],
  );

  const signUp = useCallback(async ({ fullName, email, phone, password }: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // O trigger do banco cria o perfil (sempre CUSTOMER) com estes dados.
        data: { full_name: fullName, phone: phone ? onlyDigits(phone) : null },
        emailRedirectTo: appUrl('/'),
      },
    });
    if (error) throw error;
    if (data.session) setSession(data.session);
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    // Revoga a sessão atual no Supabase e limpa os tokens locais.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl('/redefinir-senha'),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setPasswordRecovery(false);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: appUrl('/') },
    });
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.role ?? null;
    return {
      status: restoring ? 'loading' : session ? 'authenticated' : 'unauthenticated',
      session,
      user: session?.user ?? null,
      profile,
      profileStatus: !userId ? 'idle' : profileQuery.status,
      profileError: profileQuery.error,
      role,
      isStaff: role ? STAFF_ROLES.includes(role) : false,
      isAdmin: role === 'ADMIN',
      passwordRecovery,
      hasPermission: (permission: Permission) => Boolean(profile?.permissions.includes(permission)),
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      resendConfirmation,
      refreshProfile: () => profileQuery.refetch(),
    };
  }, [
    restoring,
    session,
    profile,
    userId,
    profileQuery,
    passwordRecovery,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    resendConfirmation,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
