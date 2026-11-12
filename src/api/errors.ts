import { ApiError } from './http';

/** Mensagem amigável para exibir ao usuário a partir de qualquer erro. */
export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

/** Erros de validação (400 VALIDATION_ERROR) trazem `details: [{ path: "a.b", message }]`. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') return {};
  const details = error.details;
  const result: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const issue of details as Array<{ path?: unknown; message?: unknown }>) {
      const path = Array.isArray(issue.path) ? issue.path.join('.') : issue.path;
      if (typeof path === 'string' && typeof issue.message === 'string' && !result[path]) {
        result[path] = issue.message;
      }
    }
  }
  return result;
}

/** Falhas transitórias (rede, tempo limite, 5xx) podem ser repetidas automaticamente. */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 0 || error.status === 429 || error.status >= 500;
}
