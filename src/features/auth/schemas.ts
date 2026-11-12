import { z } from 'zod';
import { onlyDigits } from '@/lib/format';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .pipe(z.email({ error: 'Informe um e-mail válido.' }));

/** US01 RN#02: mínimo de 8 caracteres com ao menos uma letra e um número. */
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(72, 'Use no máximo 72 caracteres.')
  .regex(/[A-Za-zÀ-ÿ]/, 'Inclua pelo menos uma letra.')
  .regex(/\d/, 'Inclua pelo menos um número.');

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d{10,11}$/.test(onlyDigits(value)), {
    error: 'Informe DDD + número (10 ou 11 dígitos).',
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
});
export type LoginValues = z.infer<typeof loginSchema>;

const passwordsMatch = {
  check: (data: { password: string; confirmPassword: string }) =>
    data.password === data.confirmPassword,
  options: { error: 'As senhas não coincidem.', path: ['confirmPassword'] },
};

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Informe seu nome completo.')
      .max(120, 'Use no máximo 120 caracteres.'),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch.check, passwordsMatch.options);
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine(passwordsMatch.check, passwordsMatch.options);
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
