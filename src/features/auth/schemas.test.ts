import { describe, expect, it } from 'vitest';
import { loginSchema, newPasswordSchema, passwordSchema, registerSchema } from './schemas';

describe('passwordSchema (US01 RN#02)', () => {
  it.each([
    ['curta1', 'pelo menos 8 caracteres'],
    ['somenteletras', 'pelo menos um número'],
    ['12345678', 'pelo menos uma letra'],
  ])('rejeita "%s"', (value, message) => {
    const result = passwordSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message).join(' ')).toContain(message);
  });

  it('aceita senha com letras e números', () => {
    expect(passwordSchema.safeParse('cupcake2026').success).toBe(true);
  });
});

describe('registerSchema', () => {
  const base = {
    fullName: 'Maria Souza',
    email: 'maria@example.com',
    phone: '',
    password: 'cupcake2026',
    confirmPassword: 'cupcake2026',
  };

  it('aceita dados válidos com telefone opcional vazio', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it('exige senhas iguais', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: 'outra2026' });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['confirmPassword'],
      message: 'As senhas não coincidem.',
    });
  });

  it('valida telefone com DDD', () => {
    expect(registerSchema.safeParse({ ...base, phone: '(11) 9876' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, phone: '(11) 98765-4321' }).success).toBe(true);
  });

  it('valida e-mail', () => {
    const result = registerSchema.safeParse({ ...base, email: 'maria@' });
    expect(result.error?.issues[0]?.message).toBe('Informe um e-mail válido.');
  });
});

describe('loginSchema e newPasswordSchema', () => {
  it('exige e-mail e senha', () => {
    const result = loginSchema.safeParse({ email: '', password: '' });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Informe seu e-mail.',
      'Informe sua senha.',
    ]);
  });

  it('compara a confirmação da nova senha', () => {
    expect(
      newPasswordSchema.safeParse({ password: 'nova2026a', confirmPassword: 'nova2026b' }).success,
    ).toBe(false);
  });
});
