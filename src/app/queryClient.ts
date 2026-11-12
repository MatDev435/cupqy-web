import { QueryClient } from '@tanstack/react-query';
import { isRetryable } from '@/api/errors';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Repete apenas falhas transitórias (rede, tempo limite, 5xx); erros 4xx são definitivos.
        retry: (failureCount, error) => isRetryable(error) && failureCount < 2,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: false },
    },
  });
}
