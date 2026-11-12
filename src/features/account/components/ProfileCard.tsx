import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/errors';
import { updateMe } from '@/api/profile';
import { queryKeys } from '@/api/queryKeys';
import type { Profile } from '@/api/types';
import { Alert, Button, Card, CardHeader, TextField, useToast } from '@/components/ui';
import { formatPhone, onlyDigits } from '@/lib/format';
import { profileSchema, type ProfileFormValues } from '../schemas';

export function ProfileCard({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: profile.fullName ?? '', phone: formatPhone(profile.phone) },
  });

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateMe({
        fullName: values.fullName,
        phone: values.phone ? onlyDigits(values.phone) : null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData([...queryKeys.me, updated.id], updated);
      reset({ fullName: updated.fullName ?? '', phone: formatPhone(updated.phone) });
      toast({ tone: 'success', title: 'Dados atualizados.' });
    },
  });

  return (
    <Card>
      <CardHeader title="Dados pessoais" description="Usados para identificar seus pedidos." />
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="flex flex-col gap-4"
      >
        {mutation.isError && <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>}
        <TextField
          label="Nome completo"
          required
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <TextField
          label="E-mail"
          type="email"
          value={profile.email ?? ''}
          readOnly
          disabled
          hint="O e-mail de acesso não pode ser alterado por aqui."
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <TextField
              label="Telefone"
              optional
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 98765-4321"
              error={errors.phone?.message}
              {...field}
              onChange={(event) => field.onChange(formatPhone(event.target.value))}
            />
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={mutation.isPending} disabled={!isDirty}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </Card>
  );
}
