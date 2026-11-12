import { z } from 'zod';
import { onlyDigits } from '@/lib/format';

/** UFs aceitas pela API (validators/common.js do cupqy-server). */
export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

const text = (max: number, message: string) =>
  z.string().trim().min(1, message).max(max, `Use no máximo ${max} caracteres.`);

const optionalText = (max: number) =>
  z.string().trim().max(max, `Use no máximo ${max} caracteres.`);

/** Espelha as regras do back-end para dar feedback imediato (a API valida de novo). */
export const addressSchema = z.object({
  label: optionalText(40),
  zipCode: z
    .string()
    .refine((value) => onlyDigits(value).length === 8, { error: 'CEP deve conter 8 dígitos.' }),
  street: text(150, 'Informe a rua.'),
  number: text(20, 'Informe o número.'),
  complement: optionalText(100),
  neighborhood: text(100, 'Informe o bairro.'),
  city: text(100, 'Informe a cidade.'),
  state: z.enum(BRAZILIAN_STATES, { error: 'Selecione a UF.' }),
});

export type AddressFormValues = z.input<typeof addressSchema>;

export const emptyAddress: AddressFormValues = {
  label: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '' as AddressFormValues['state'],
};

/** Valores do formulário → corpo aceito pela API (CEP só com dígitos, vazios como null). */
export function toAddressPayload(values: AddressFormValues) {
  return {
    zipCode: onlyDigits(values.zipCode),
    street: values.street.trim(),
    number: values.number.trim(),
    complement: values.complement?.trim() || null,
    neighborhood: values.neighborhood.trim(),
    city: values.city.trim(),
    state: values.state,
  };
}

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Informe seu nome completo.')
    .max(120, 'Use no máximo 120 caracteres.'),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{10,11}$/.test(onlyDigits(value)), {
      error: 'Informe DDD + número (10 ou 11 dígitos).',
    }),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;
