import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import type { Role } from '@/api/types';
import { getErrorMessage } from '@/api/errors';
import { ButtonLink, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useAuth } from './authContext';

/** Exige sessão; sem ela, envia ao login preservando o destino. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading')
    return <LoadingState label="Verificando sua sessão…" className="py-24" />;
  if (status === 'unauthenticated') {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/entrar?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return children ?? <Outlet />;
}

/**
 * Exige um dos papéis informados (lido da API). A proteção real é feita pela API — este guard
 * apenas evita exibir telas que o usuário não pode usar.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const { profile, profileStatus, profileError, refreshProfile } = useAuth();

  if (profileStatus === 'pending' || profileStatus === 'idle') {
    return <LoadingState label="Carregando permissões…" className="py-24" />;
  }
  if (profileStatus === 'error' || !profile) {
    return (
      <div className="container-page py-16">
        <ErrorState
          title="Não foi possível verificar suas permissões"
          message={getErrorMessage(profileError, 'Tente novamente em instantes.')}
          onRetry={() => void refreshProfile()}
        />
      </div>
    );
  }
  if (!roles.includes(profile.role)) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShieldAlert />}
          title="Acesso restrito"
          description="Sua conta não tem permissão para acessar esta área."
          action={<ButtonLink to="/">Voltar à loja</ButtonLink>}
        />
      </div>
    );
  }
  return children ?? <Outlet />;
}

/** Páginas só para visitantes (login, cadastro): quem já entrou volta para a loja. */
export function GuestOnly({ children }: { children?: ReactNode }) {
  const { status, passwordRecovery } = useAuth();
  if (status === 'loading') return <LoadingState className="py-24" />;
  if (status === 'authenticated' && !passwordRecovery) return <Navigate to="/" replace />;
  return children ?? <Outlet />;
}
