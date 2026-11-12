import { describe, expect, it } from 'vitest';
import { buildCupcake } from '@/test/fixtures';
import { cupcakeSchema, toCupcakeBody, toFormValues } from './cupcakeSchema';

const valid = {
  ...toFormValues(),
  name: 'Red Velvet',
  description: 'Massa aveludada.',
  flavor: 'Baunilha',
  ingredients: 'Farinha, cacau.',
  price: '12,90',
};

describe('cupcakeSchema', () => {
  it('rejeita preço zero ou negativo (US15 RN#02)', () => {
    for (const price of ['0', '0,00', '-5', 'abc', '']) {
      expect(cupcakeSchema.safeParse({ ...valid, price }).success).toBe(false);
    }
    expect(cupcakeSchema.safeParse(valid).success).toBe(true);
  });

  it('valida peso e tabela nutricional', () => {
    expect(cupcakeSchema.safeParse({ ...valid, weightGrams: '80,5' }).success).toBe(false);
    expect(
      cupcakeSchema.safeParse({ ...valid, nutrition: { ...valid.nutrition, calories: '-1' } })
        .success,
    ).toBe(false);
  });
});

describe('conversões', () => {
  it('monta o corpo da API em centavos, com vazios como null', () => {
    const body = toCupcakeBody({
      ...valid,
      weightGrams: '80',
      nutrition: { ...valid.nutrition, calories: '320', proteinsGrams: '4,5' },
    });
    expect(body).toEqual({
      name: 'Red Velvet',
      description: 'Massa aveludada.',
      flavor: 'Baunilha',
      ingredients: 'Farinha, cacau.',
      priceCents: 1290,
      weightGrams: 80,
      size: null,
      categoryId: null,
      dietaryTagIds: [],
      isActive: true,
      nutritionalInfo: { calories: 320, proteinsGrams: 4.5 },
    });
  });

  it('preenche o formulário a partir do cupcake da API', () => {
    const values = toFormValues({
      ...buildCupcake({ priceCents: 990, nutritionalInfo: { calories: 300, proteinsGrams: 4.5 } }),
      isActive: false,
      imagePath: null,
      createdAt: '',
      updatedAt: '',
    });
    expect(values.price).toBe('9,90');
    expect(values.isActive).toBe(false);
    expect(values.nutrition.proteinsGrams).toBe('4,5');
    expect(values.nutrition.fiberGrams).toBe('');
  });
});
