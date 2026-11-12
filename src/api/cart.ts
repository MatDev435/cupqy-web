import type { ValidateCartBody } from './contract';
import { sendData } from './http';
import type { CartEvaluation } from './types';

/** Preços e estoque atuais calculados pelo servidor (US08 RN#02). Rota pública. */
export function validateCart(items: ValidateCartBody['items'], signal?: AbortSignal) {
  return sendData<CartEvaluation>('POST', '/cart/validate', { body: { items }, signal });
}
