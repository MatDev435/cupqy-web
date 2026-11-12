import { describe, expect, it } from 'vitest';
import {
  centsToInput,
  formatCep,
  formatDateOnly,
  formatElapsedMinutes,
  formatMoney,
  formatPhone,
  parseMoneyToCents,
  plural,
} from './format';

const nbsp = (value: string) => value.replace(/ /g, ' ');

describe('formatMoney', () => {
  it('converte centavos para reais', () => {
    expect(nbsp(formatMoney(1290))).toBe('R$ 12,90');
    expect(nbsp(formatMoney(0))).toBe('R$ 0,00');
    expect(nbsp(formatMoney(123456))).toBe('R$ 1.234,56');
  });

  it('exibe travessão para valores ausentes', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });
});

describe('parseMoneyToCents', () => {
  it.each([
    ['12,90', 1290],
    ['R$ 1.234,56', 123456],
    ['12.5', 1250],
    ['7', 700],
  ])('"%s" → %d centavos', (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it('retorna null para texto inválido', () => {
    expect(parseMoneyToCents('')).toBeNull();
    expect(parseMoneyToCents('abc')).toBeNull();
  });

  it('é o inverso de centsToInput', () => {
    expect(centsToInput(1290)).toBe('12,90');
    expect(parseMoneyToCents(centsToInput(4599))).toBe(4599);
  });
});

describe('máscaras', () => {
  it('formata CEP', () => {
    expect(formatCep('01310100')).toBe('01310-100');
    expect(formatCep('01310')).toBe('01310');
    expect(formatCep('01310-100999')).toBe('01310-100');
  });

  it('formata telefone fixo e celular', () => {
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    expect(formatPhone('11')).toBe('(11');
  });
});

describe('datas e tempo', () => {
  it('formata data sem conversão de fuso', () => {
    expect(formatDateOnly('2026-11-12')).toBe('12/11/2026');
  });

  it('formata tempo decorrido', () => {
    expect(formatElapsedMinutes(0)).toBe('agora');
    expect(formatElapsedMinutes(12)).toBe('12 min');
    expect(formatElapsedMinutes(65)).toBe('1 h 05 min');
    expect(formatElapsedMinutes(120)).toBe('2 h');
  });

  it('pluraliza', () => {
    expect(plural(1, 'item', 'itens')).toBe('1 item');
    expect(plural(3, 'item', 'itens')).toBe('3 itens');
  });
});
