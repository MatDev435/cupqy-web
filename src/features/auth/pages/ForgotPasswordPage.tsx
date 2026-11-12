import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { isAuthError } from '@supabase/supabase-js';
import { MailCheck } from 'lucide-react';
import { Alert, Button, ButtonLink, TextField } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '../authContext';
import { authErrorMessage } from '../authErrors';
import { AuthCard } from '../components/AuthCard';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';

/**
 * Solicitação de recuperação pelo fluxo nativo do Supabase Auth (link por e-mail via Resend).
 * A confirmação é sempre a mesma, exista ou não a conta (US05 RN#03).
 */
export function ForgotPasswordPage() {
  useDocumentTitle('Recuperar senha');
  const { requestPasswordReset } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const send = async (email: string) => {
    setError(null);
    try {
      await requestPasswordReset(email);
      setSentTo(email);
    } catch (caught) {
      // Só exibe erros que não revelam se o e-mail existe (limite de envio, indisponibilidade).
      const status = isAuthError(caught) ? (caught.status ?? 0) : 0;
      if (status === 429 || status === 0 || status >= 500) {
        setError(authErrorMessage(caught, 'reset'));
      } else {
        setSentTo(email);
      }
    }
  };

  const onSubmit = handleSubmit(({ email }) => send(email));

  if (sentTo) {
    return (
      <AuthCard
        title="Verifique seu e-mail"
        description="Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha."
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <MailCheck className="size-12 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted">
            O link é de uso único e expira após algum tempo. Não encontrou a mensagem? Verifique a
            caixa de spam.
          </p>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="secondary"
              fullWidth
              loading={isSubmitting}
              onClick={() => void send(getValues('email') || sentTo)}
            >
              Enviar novamente
            </Button>
            <ButtonLink to="/entrar" variant="ghost" fullWidth>
              Voltar ao login
            </ButtonLink>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar senha"
      description="Informe o e-mail da sua conta. Enviaremos um link seguro para você criar uma nova senha."
      footer={
        <Link to="/entrar" className="font-medium text-primary hover:underline">
          Voltar ao login
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && <Alert tone="error">{error}</Alert>}
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Enviar link de recuperação
        </Button>
      </form>
    </AuthCard>
  );
}
