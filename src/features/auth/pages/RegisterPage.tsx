import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { MailCheck } from 'lucide-react';
import { Alert, Button, ButtonLink, TextField, useToast } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatPhone } from '@/lib/format';
import { useAuth } from '../authContext';
import { authErrorMessage } from '../authErrors';
import { AuthCard } from '../components/AuthCard';
import { PasswordField } from '../components/PasswordField';
import { safeRedirect } from '../roles';
import { registerSchema, type RegisterValues } from '../schemas';

export function RegisterPage() {
  useDocumentTitle('Criar conta');
  const { signUp, resendConfirmation } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = safeRedirect(searchParams.get('redirect'));
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ fullName, email, phone, password }) => {
    setError(null);
    try {
      const { needsConfirmation } = await signUp({ fullName, email, phone, password });
      if (needsConfirmation) {
        setPendingEmail(email);
        return;
      }
      // US01 CA#04: autenticado automaticamente e levado à Home com boas-vindas.
      toast({
        tone: 'success',
        title: `Boas-vindas, ${fullName.split(' ')[0]}!`,
        description: 'Sua conta foi criada.',
      });
      navigate(redirect ?? '/', { replace: true });
    } catch (caught) {
      setError(authErrorMessage(caught, 'signup'));
    }
  });

  if (pendingEmail) {
    return (
      <AuthCard
        title="Confirme seu e-mail"
        description={
          <>
            Enviamos um link de confirmação para <strong className="text-fg">{pendingEmail}</strong>
            . Abra o e-mail para ativar sua conta.
          </>
        }
      >
        <div className="flex flex-col items-center gap-5 text-center">
          <MailCheck className="size-12 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted">
            Se este e-mail já tiver cadastro, entre com sua senha ou recupere o acesso. Não
            encontrou a mensagem? Verifique a caixa de spam.
          </p>
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="secondary"
              fullWidth
              loading={resending}
              onClick={async () => {
                setResending(true);
                try {
                  await resendConfirmation(pendingEmail);
                  toast({ tone: 'success', title: 'Enviamos um novo link de confirmação.' });
                } catch (caught) {
                  toast({ tone: 'error', title: authErrorMessage(caught, 'signup') });
                } finally {
                  setResending(false);
                }
              }}
            >
              Reenviar e-mail
            </Button>
            <ButtonLink to="/entrar" variant="ghost" fullWidth>
              Ir para o login
            </ButtonLink>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Criar conta"
      description="Cadastre-se para pedir seus cupcakes favoritos com mais agilidade."
      footer={
        <>
          Já tem uma conta?{' '}
          <Link
            to={redirect ? `/entrar?redirect=${encodeURIComponent(redirect)}` : '/entrar'}
            className="font-medium text-primary hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && <Alert tone="error">{error}</Alert>}
        <TextField
          label="Nome completo"
          autoComplete="name"
          required
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <TextField
              label="Telefone"
              optional
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              placeholder="(11) 98765-4321"
              error={errors.phone?.message}
              {...field}
              onChange={(event) => field.onChange(formatPhone(event.target.value))}
            />
          )}
        />
        <PasswordField
          label="Senha"
          autoComplete="new-password"
          required
          hint="Mínimo de 8 caracteres, com letras e números."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField
          label="Confirmação de senha"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Criar conta
        </Button>
        <p className="text-center text-xs text-subtle">
          Seus dados são usados apenas para pedidos e entregas. Você pode excluir sua conta a
          qualquer momento.
        </p>
      </form>
    </AuthCard>
  );
}
