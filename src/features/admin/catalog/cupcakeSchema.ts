import { z } from 'zod';
import type { CreateCupcakeBody } from '@/api/contract';
import type { AdminCupcake, NutritionalInfo } from '@/api/types';
import { centsToInput, parseMoneyToCents } from '@/lib/format';

export const NUTRITION_FIELDS: Array<{ key: keyof NutritionalInfo; label: string; unit: string }> =
  [
    { key: 'servingSizeGrams', label: 'Porção', unit: 'g' },
    { key: 'calories', label: 'Valor energético', unit: 'kcal' },
    { key: 'carbohydratesGrams', label: 'Carboidratos', unit: 'g' },
    { key: 'sugarsGrams', label: 'Açúcares', unit: 'g' },
    { key: 'proteinsGrams', label: 'Proteínas', unit: 'g' },
    { key: 'totalFatGrams', label: 'Gorduras totais', unit: 'g' },
    { key: 'saturatedFatGrams', label: 'Gorduras saturadas', unit: 'g' },
    { key: 'transFatGrams', label: 'Gorduras trans', unit: 'g' },
    { key: 'fiberGrams', label: 'Fibra alimentar', unit: 'g' },
    { key: 'sodiumMg', label: 'Sódio', unit: 'mg' },
  ];

const optionalNumber = (max: number, integer = false) =>
  z
    .string()
    .trim()
    .refine(
      (value) => {
        if (value === '') return true;
        const number = Number(value.replace(',', '.'));
        return (
          Number.isFinite(number) &&
          number >= 0 &&
          number <= max &&
          (!integer || Number.isInteger(number))
        );
      },
      {
        error: integer
          ? `Informe um número inteiro entre 0 e ${max}.`
          : `Informe um número entre 0 e ${max}.`,
      },
    );

const text = (max: number, message: string, min = 1) =>
  z.string().trim().min(min, message).max(max, `Use no máximo ${max} caracteres.`);

/** Espelha os validators do back-end (catalogAdmin.validator.js) para feedback imediato. */
export const cupcakeSchema = z.object({
  name: text(100, 'Informe o nome (mínimo de 2 caracteres).', 2),
  description: text(1000, 'Informe a descrição.'),
  flavor: text(60, 'Informe o sabor.'),
  ingredients: text(1000, 'Informe os ingredientes.'),
  price: z.string().refine(
    (value) => {
      const cents = parseMoneyToCents(value);
      return cents !== null && cents > 0 && cents <= 1_000_000;
    },
    // US15 RN#02: preço não pode ser zero ou negativo.
    { error: 'Informe um preço maior que zero (ex.: 12,90).' },
  ),
  weightGrams: optionalNumber(5000, true).refine((value) => value === '' || Number(value) > 0, {
    error: 'O peso deve ser maior que zero.',
  }),
  size: z.string().trim().max(60, 'Use no máximo 60 caracteres.'),
  categoryId: z.string(),
  dietaryTagIds: z.array(z.string()),
  isActive: z.boolean(),
  nutrition: z.object(
    Object.fromEntries(
      NUTRITION_FIELDS.map((field) => [field.key, optionalNumber(100_000)]),
    ) as Record<keyof NutritionalInfo, ReturnType<typeof optionalNumber>>,
  ),
});

export type CupcakeFormValues = z.infer<typeof cupcakeSchema>;

const emptyNutrition = Object.fromEntries(
  NUTRITION_FIELDS.map((field) => [field.key, '']),
) as CupcakeFormValues['nutrition'];

export function toFormValues(cupcake?: AdminCupcake): CupcakeFormValues {
  if (!cupcake) {
    return {
      name: '',
      description: '',
      flavor: '',
      ingredients: '',
      price: '',
      weightGrams: '',
      size: '',
      categoryId: '',
      dietaryTagIds: [],
      isActive: true,
      nutrition: emptyNutrition,
    };
  }
  return {
    name: cupcake.name,
    description: cupcake.description,
    flavor: cupcake.flavor,
    ingredients: cupcake.ingredients,
    price: centsToInput(cupcake.priceCents),
    weightGrams: cupcake.weightGrams ? String(cupcake.weightGrams) : '',
    size: cupcake.size ?? '',
    categoryId: cupcake.category?.id ?? '',
    dietaryTagIds: cupcake.dietaryTags.map((tag) => tag.id),
    isActive: cupcake.isActive,
    nutrition: Object.fromEntries(
      NUTRITION_FIELDS.map((field) => [
        field.key,
        cupcake.nutritionalInfo?.[field.key] !== undefined
          ? String(cupcake.nutritionalInfo[field.key]).replace('.', ',')
          : '',
      ]),
    ) as CupcakeFormValues['nutrition'],
  };
}

/** Valores do formulário → corpo aceito pela API (preço em centavos). */
export function toCupcakeBody(values: CupcakeFormValues): CreateCupcakeBody {
  const nutritionEntries = NUTRITION_FIELDS.flatMap((field) => {
    const raw = values.nutrition[field.key];
    return raw === '' ? [] : [[field.key, Number(raw.replace(',', '.'))] as const];
  });
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    flavor: values.flavor.trim(),
    ingredients: values.ingredients.trim(),
    priceCents: parseMoneyToCents(values.price)!,
    weightGrams: values.weightGrams ? Number(values.weightGrams) : null,
    size: values.size.trim() || null,
    categoryId: values.categoryId || null,
    dietaryTagIds: values.dietaryTagIds,
    isActive: values.isActive,
    nutritionalInfo: nutritionEntries.length ? Object.fromEntries(nutritionEntries) : null,
  };
}
