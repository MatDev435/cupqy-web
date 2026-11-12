import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { LinkIcon } from 'lucide-react';
import { Alert, Button, ButtonLink, LoadingState } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { initialAuthRedirect } from '@/lib/supabase';
import { useAuth } from '../authContext';
import { authErrorMessage } from '../authErrors';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import { newPasswordSchema, type NewPasswordValues } from '../schemas';
import type { AuthPageState } from './LoginPage';

/**
 * Página aberta pelo link de recuperação do Supabase Auth. O supabase-js cria uma sessão de
 * recuperação a partir da URL (evento PASSWORD_RECOVERY) e a nova senha é gravada com updateUser.
 */
export function ResetPasswordPage() {
  useDocumentTitle('Redefinir senha');
  const { status, passwordRecovery, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) });

  const linkError = initialAuthRedirect.error;

  if (!linkError && status === 'loading') {
    return <LoadingState label="Validando o link…" className="py-32" />;
  }

  if (linkError || status !== 'authenticated' || !passwordRecovery) {
    const expired = initialAuthRedirect.errorCode === 'otp_expired';
    return (
      <AuthCard
        title={expired ? 'Link expirado' : 'Link inválido'}
        description={
          expired
            ? 'Este link de recuperação expirou ou já foi usado. Solicite um novo para continuar.'
            : 'Não foi possível validar o link de recuperação. Ele pode estar incompleto, já ter sido usado ou ter expirado.'
        }
      >
        <div className="flex flex-col items-center gap-5">
          <LinkIcon className="size-12 text-primary" aria-hidden="true" />
          <ButtonLink to="/esqueci-senha" fullWidth>
            Solicitar novo link
          </ButtonLink>
          <ButtonLink to="/entrar" variant="ghost" fullWidth>
            Voltar ao login
          </ButtonLink>
        </div>
      </AuthCard>
    );
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await updatePassword(password);
      await signOut();
      // US05 CA#06: volta ao login com mensagem de sucesso.
      navigate('/entrar', {
        replace: true,
        state: { message: 'Senha redefinida! Entre com a nova senha.' } satisfies AuthPageState,
      });
    } catch (caught) {
      setError(authErrorMessage(caught, 'update'));
    }
  });

  return (
    <AuthCard
      title="Criar nova senha"
      description="Escolha uma senha forte para proteger sua conta."
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && <Alert tone="error">{error}</Alert>}
        <PasswordField
          label="Nova senha"
          autoComplete="new-password"
          required
          hint="Mínimo de 8 caracteres, com letras e números."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField
          label="Confirmação da nova senha"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Salvar nova senha
        </Button>
      </form>
    </AuthCard>
  );
}
