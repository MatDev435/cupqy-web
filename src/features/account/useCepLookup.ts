import { useState } from 'react';
import { isApiError } from '@/api/http';
import { lookupCep } from '@/api/store';
import type { CepAddress } from '@/api/types';
import { onlyDigits } from '@/lib/format';

export type CepStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'found'; address: CepAddress }
  | { state: 'error'; message: string };

/** Autocompleta o endereço pelo CEP usando a API (BrasilAPI/ViaCEP no servidor). */
export function useCepLookup() {
  const [status, setStatus] = useState<CepStatus>({ state: 'idle' });

  const lookup = async (cep: string): Promise<CepAddress | null> => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return null;
    setStatus({ state: 'loading' });
    try {
      const address = await lookupCep(digits);
      setStatus({ state: 'found', address });
      return address;
    } catch (error) {
      setStatus({
        state: 'error',
        message: isApiError(error, 'CEP_NOT_FOUND')
          ? 'CEP não encontrado. Confira os números ou preencha o endereço manualmente.'
          : isApiError(error, ['CEP_SERVICE_UNAVAILABLE', 'NETWORK_ERROR', 'TIMEOUT'])
            ? 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.'
            : isApiError(error, 'VALIDATION_ERROR')
              ? 'CEP inválido.'
              : 'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
      });
      return null;
    }
  };

  return { status, lookup, reset: () => setStatus({ state: 'idle' }) };
}
