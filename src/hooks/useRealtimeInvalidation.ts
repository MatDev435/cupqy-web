import { useEffect, useId, useRef, useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface RealtimeOptions {
  /** Tabela publicada no Supabase Realtime (orders, order_status_history, daily_stock). */
  table: 'orders' | 'order_status_history' | 'daily_stock';
  /** Filtro do Realtime, ex.: "id=eq.<uuid>". */
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** Queries invalidadas a cada evento. */
  queryKeys: QueryKey[];
  enabled?: boolean;
  /** Chamado a cada evento (ex.: anunciar um novo pedido na cozinha). */
  onEvent?: (payload: { eventType: string; new: Record<string, unknown> }) => void;
}

/**
 * Usa o Supabase Realtime apenas como GATILHO: cada mudança invalida as queries indicadas, que
 * são buscadas de novo na API (que aplica as regras de apresentação). As políticas RLS garantem
 * que cada usuário só receba eventos das linhas que pode ver.
 *
 * Retorna `connected`; quando falso, as telas usam polling como alternativa.
 */
export function useRealtimeInvalidation({
  table,
  filter,
  event = '*',
  queryKeys,
  enabled = true,
  onEvent,
}: RealtimeOptions) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const id = useId();
  const keysRef = useRef(queryKeys);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    keysRef.current = queryKeys;
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const channel = supabase
      .channel(`cupqy:${table}:${filter ?? 'all'}:${id}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, ...(filter ? { filter } : {}) },
        (payload) => {
          onEventRef.current?.({
            eventType: payload.eventType,
            new: (payload.new ?? {}) as Record<string, unknown>,
          });
          // Agrupa rajadas de eventos (ex.: baixa de estoque de vários itens) em um único refetch.
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            for (const queryKey of keysRef.current) {
              void queryClient.invalidateQueries({ queryKey });
            }
          }, 400);
        },
      )
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    return () => {
      window.clearTimeout(timer);
      setConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [enabled, table, filter, event, id, queryClient]);

  return { connected };
}
