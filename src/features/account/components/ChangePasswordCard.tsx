import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, CardHeader, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/authContext';
import { authErrorMessage } from '@/features/auth/authErrors';
import { PasswordField } from '@/features/auth/components/PasswordField';
import { newPasswordSchema, type NewPasswordValues } from '@/features/auth/schemas';

/** Atualização de senha da sessão atual pelo Supabase Auth. */
export function ChangePasswordCard() {
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await updatePassword(password);
      reset({ password: '', confirmPassword: '' });
      toast({ tone: 'success', title: 'Senha alterada com sucesso.' });
    } catch (caught) {
      setError(authErrorMessage(caught, 'update'));
    }
  });

  return (
    <Card>
      <CardHeader title="Segurança" description="Altere a senha usada para entrar no Cupqy." />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={isSubmitting}>
            Alterar senha
          </Button>
        </div>
      </form>
    </Card>
  );
}
