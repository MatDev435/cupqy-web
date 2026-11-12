import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button, SelectField, TextField } from '@/components/ui';
import { formatCep } from '@/lib/format';
import { BRAZILIAN_STATES, addressSchema, emptyAddress, type AddressFormValues } from '../schemas';
import { useCepLookup } from '../useCepLookup';

interface AddressFormProps {
  defaultValues?: Partial<AddressFormValues>;
  onSubmit: (values: AddressFormValues) => void | Promise<void>;
  submitLabel: string;
  /** Campo "Identificação" (Casa, Trabalho…) — usado no cadastro de endereços. */
  showLabel?: boolean;
  /** Conteúdo extra antes do botão (ex.: "Salvar este endereço"). */
  children?: ReactNode;
  onCancel?: () => void;
  submitting?: boolean;
  idPrefix: string;
}

/** Endereço com máscara de CEP e preenchimento automático (US09 RNF#02). */
export function AddressForm({
  defaultValues,
  onSubmit,
  submitLabel,
  showLabel = false,
  children,
  onCancel,
  submitting = false,
  idPrefix,
}: AddressFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { ...emptyAddress, ...defaultValues },
  });
  const cep = useCepLookup();

  const fillFromCep = async (value: string) => {
    const address = await cep.lookup(value);
    if (!address) return;
    const options = { shouldValidate: true, shouldDirty: true } as const;
    if (address.street) setValue('street', address.street, options);
    if (address.neighborhood) setValue('neighborhood', address.neighborhood, options);
    setValue('city', address.city, options);
    if ((BRAZILIAN_STATES as readonly string[]).includes(address.state)) {
      setValue('state', address.state as AddressFormValues['state'], options);
    }
    setFocus(address.street ? 'number' : 'street');
  };

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      noValidate
      className="flex flex-col gap-4"
    >
      {showLabel && (
        <TextField
          id={`${idPrefix}-label`}
          label="Identificação"
          optional
          placeholder="Casa, Trabalho…"
          error={errors.label?.message}
          {...register('label')}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <Controller
          control={control}
          name="zipCode"
          render={({ field }) => (
            <TextField
              id={`${idPrefix}-zip`}
              label="CEP"
              required
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              error={
                errors.zipCode?.message ??
                (cep.status.state === 'error' ? cep.status.message : undefined)
              }
              hint={cep.status.state === 'found' ? 'Endereço preenchido pelo CEP.' : undefined}
              {...field}
              onChange={(event) => {
                const masked = formatCep(event.target.value);
                field.onChange(masked);
                if (masked.length === 9) void fillFromCep(masked);
                else if (cep.status.state !== 'idle') cep.reset();
              }}
              rightSlot={
                cep.status.state === 'loading' ? (
                  <Loader2
                    className="mr-2 size-4 animate-spin text-muted"
                    aria-label="Buscando CEP"
                  />
                ) : cep.status.state === 'found' ? (
                  <CheckCircle2 className="mr-2 size-4 text-success" aria-hidden="true" />
                ) : undefined
              }
            />
          )}
        />
        <TextField
          id={`${idPrefix}-street`}
          label="Rua"
          required
          autoComplete="address-line1"
          error={errors.street?.message}
          {...register('street')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <TextField
          id={`${idPrefix}-number`}
          label="Número"
          required
          error={errors.number?.message}
          {...register('number')}
        />
        <TextField
          id={`${idPrefix}-complement`}
          label="Complemento"
          optional
          autoComplete="address-line2"
          placeholder="Apto, bloco…"
          error={errors.complement?.message}
          {...register('complement')}
        />
      </div>
      <TextField
        id={`${idPrefix}-neighborhood`}
        label="Bairro"
        required
        error={errors.neighborhood?.message}
        {...register('neighborhood')}
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <TextField
          id={`${idPrefix}-city`}
          label="Cidade"
          required
          autoComplete="address-level2"
          error={errors.city?.message}
          {...register('city')}
        />
        <SelectField
          id={`${idPrefix}-state`}
          label="UF"
          required
          error={errors.state?.message}
          {...register('state')}
        >
          <option value="">UF</option>
          {BRAZILIAN_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </SelectField>
      </div>
      {children}
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={submitting || isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={submitting || isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
