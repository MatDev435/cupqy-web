/**
 * Formatação para exibição (pt-BR). Valores monetários chegam da API em centavos.
 * Nenhuma função aqui calcula valores autoritativos — apenas apresenta o que a API devolve.
 */

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '—';
  return currency.format(cents / 100);
}

/**
 * Converte o texto digitado em um campo de preço ("12,90", "R$ 1.234,5") para centavos.
 * Retorna null se o texto não representar um valor válido.
 */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;
  // Formato brasileiro: ponto como milhar e vírgula como decimal.
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Centavos → texto editável em campo de preço ("12,90"). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' });
const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : '—';
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : '—';
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? timeFormatter.format(date) : '—';
}

export function formatLongDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? longDateFormatter.format(date) : '—';
}

/** Data no formato AAAA-MM-DD ("date only") → "12/11/2026", sem conversão de fuso. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/** Minutos decorridos de forma legível: "agora", "12 min", "1 h 05 min". */
export function formatElapsedMinutes(minutes: number): string {
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')} min` : `${hours} h`;
}

/** Prazo em minutos → "30 min" ou "1 h 15 min". */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  return minutes < 1 ? 'menos de 1 min' : formatElapsedMinutes(minutes);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Máscara de CEP: 01310100 → 01310-100 */
export function formatCep(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** Máscara de telefone: 11987654321 → (11) 98765-4321 */
export function formatPhone(value: string | null | undefined): string {
  const digits = onlyDigits(value ?? '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return '—';
  return `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
}

/** Pluralização simples: plural(2, 'item', 'itens') → "2 itens" */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
