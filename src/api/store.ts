import type { ShippingQuoteBody } from './contract';
import { getData, sendData } from './http';
import type { CepAddress, ShippingQuote, StoreInfo } from './types';

export function getStoreInfo(signal?: AbortSignal) {
  return getData<StoreInfo>('/store', { signal });
}

/** Autocompleta o endereço pelo CEP (BrasilAPI/ViaCEP no servidor). */
export function lookupCep(cep: string, signal?: AbortSignal) {
  return getData<CepAddress>(`/shipping/cep/${encodeURIComponent(cep)}`, { signal });
}

/** Cotação de frete calculada pelo servidor — o front-end nunca recalcula o valor. */
export function quoteShipping(body: ShippingQuoteBody, signal?: AbortSignal) {
  return sendData<ShippingQuote>('POST', '/shipping/quote', { body, auth: 'required', signal });
}
