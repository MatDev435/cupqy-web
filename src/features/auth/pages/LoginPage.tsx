import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { isAuthError } from '@supabase/supabase-js';
import { Alert, Button, TextField, useToast } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '../authContext';
import { authErrorMessage } from '../authErrors';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import { homeForRole, safeRedirect } from '../roles';
import { loginSchema, type LoginValues } from '../schemas';

export interface AuthPageState {
  message?: string;
}

export function LoginPage() {
  useDocumentTitle('Entrar');
  const { signIn, resendConfirmation } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirect = safeRedirect(searchParams.get('redirect'));
  const notice = (location.state as AuthPageState | null)?.message;

  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    setUnconfirmedEmail(null);
    try {
      const profile = await signIn(email, password);
      toast({
        tone: 'success',
        title: profile?.fullName
          ? `Que bom te ver, ${profile.fullName.split(' ')[0]}!`
          : 'Você entrou na sua conta.',
      });
      navigate(redirect ?? homeForRole(profile?.role), { replace: true });
    } catch (caught) {
      if (isAuthError(caught) && caught.code === 'email_not_confirmed') setUnconfirmedEmail(email);
      setError(authErrorMessage(caught, 'signin'));
    }
  });

  const resend = async () => {
    if (!unconfirmedEmail) return;
    setResending(true);
    try {
      await resendConfirmation(unconfirmedEmail);
      toast({ tone: 'success', title: 'Enviamos um novo link de confirmação.' });
    } catch (caught) {
      toast({ tone: 'error', title: authErrorMessage(caught, 'signup') });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard
      title="Entrar"
      description="Acesse sua conta para finalizar pedidos e acompanhar entregas."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link
            to={redirect ? `/cadastro?redirect=${encodeURIComponent(redirect)}` : '/cadastro'}
            className="font-medium text-primary hover:underline"
          >
            Criar uma conta
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {notice && !error && <Alert tone="success">{notice}</Alert>}
        {error && (
          <Alert
            tone="error"
            action={
              unconfirmedEmail && (
                <Button size="sm" variant="secondary" onClick={resend} loading={resending}>
                  Reenviar e-mail de confirmação
                </Button>
              )
            }
          >
            {error}
          </Alert>
        )}
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            label="Senha"
            autoComplete="current-password"
            required
            error={errors.password?.message}
            {...register('password')}
          />
          <Link
            to="/esqueci-senha"
            className="self-end text-sm text-muted underline-offset-4 hover:text-primary hover:underline"
          >
            Esqueci a senha
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthCard>
  );
}
