import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleSlash, Package, RotateCcw, Save, Warehouse } from 'lucide-react';
import { getStock, setCupcakeStock, setStock } from '@/api/admin';
import { getErrorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { StockItem, StockOverview } from '@/api/types';
import { CupcakeImage } from '@/components/brand/CupcakeImage';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Skeleton,
  Switch,
  useToast,
} from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/cn';
import { formatDateOnly } from '@/lib/format';

const MAX_QUANTITY = 10_000;

function todayIn(timeZone = 'America/Sao_Paulo') {
  // AAAA-MM-DD no fuso da loja (en-CA formata como ISO).
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

function parseQuantity(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const quantity = Number(value);
  return quantity <= MAX_QUANTITY ? quantity : null;
}

function StatusBadges({ item, threshold }: { item: StockItem; threshold: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {!item.cupcake.isActive && <Badge>Inativo</Badge>}
      {!item.isSet ? (
        <Badge tone="neutral">Não definido</Badge>
      ) : item.soldOut ? (
        <Badge tone="danger" icon={<CircleSlash />}>
          Esgotado
        </Badge>
      ) : item.lowStock ? (
        <Badge tone="warning" icon={<AlertTriangle />}>
          Estoque baixo (&lt; {threshold})
        </Badge>
      ) : (
        <Badge tone="success" dot>
          OK
        </Badge>
      )}
    </div>
  );
}

/** Estoque diário (US17): quantidade disponível por cupcake e por dia, com alertas. */
export function AdminStockPage() {
  useDocumentTitle('Estoque');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = todayIn();
  const [date, setDate] = useState(today);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [toZero, setToZero] = useState<StockItem | null>(null);

  const stockKey = queryKeys.admin.stock(date);
  const stock = useQuery({
    queryKey: stockKey,
    queryFn: ({ signal }) => getStock({ date }, signal),
  });

  const onSaved = (overview: StockOverview) => {
    queryClient.setQueryData(stockKey, overview);
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'cupcakes'] });
  };

  const changes = Object.entries(drafts).flatMap(([cupcakeId, value]) => {
    const item = stock.data?.items.find((entry) => entry.cupcake.id === cupcakeId);
    const quantity = parseQuantity(value);
    if (!item || quantity === null || (item.isSet && quantity === item.quantity)) return [];
    return [{ cupcakeId, quantity }];
  });
  const invalidDrafts = Object.values(drafts).filter((value) => parseQuantity(value) === null);

  // US17 CA#02 / RNF#02: gravação em lote atômica, sem recarregar a página.
  const saveAll = useMutation({
    mutationFn: () => setStock({ date, items: changes }),
    onSuccess: (overview) => {
      onSaved(overview);
      setDrafts({});
      toast({
        tone: 'success',
        title: 'Estoque atualizado.',
        description: `${changes.length} cupcake(s) alterado(s).`,
      });
    },
  });

  // US17 CA#04: zerar manualmente a qualquer momento.
  const zero = useMutation({
    mutationFn: (item: StockItem) => setCupcakeStock(item.cupcake.id, { date, quantity: 0 }),
    onSuccess: (overview, item) => {
      onSaved(overview);
      setDrafts(({ [item.cupcake.id]: _removed, ...rest }) => rest);
      setToZero(null);
      toast({ tone: 'success', title: `${item.cupcake.name} zerado.` });
    },
    onError: (error) => {
      setToZero(null);
      toast({
        tone: 'error',
        title: 'Não foi possível zerar',
        description: getErrorMessage(error),
      });
    },
  });

  const overview = stock.data;
  const isPast = date < today;
  const items = (overview?.items ?? []).filter(
    (item) => !onlyAlerts || item.lowStock || item.soldOut,
  );
  // Ativos primeiro.
  const sorted = items.toSorted((a, b) => Number(b.cupcake.isActive) - Number(a.cupcake.isActive));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Estoque diário"
        description="Defina quantas unidades de cada cupcake podem ser vendidas no dia. A baixa acontece automaticamente quando o pagamento é confirmado."
      />

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stock-date" className="text-sm font-medium text-fg">
            Data
          </label>
          <Input
            id="stock-date"
            type="date"
            value={date}
            onChange={(event) => {
              if (!event.target.value) return;
              setDate(event.target.value);
              setDrafts({});
            }}
            className="w-48"
          />
        </div>
        {date !== today && (
          <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
            Voltar para hoje
          </Button>
        )}
        <Switch
          className="ml-auto"
          label="Somente alertas"
          description="Estoque baixo ou esgotado"
          checked={onlyAlerts}
          onChange={(event) => setOnlyAlerts(event.target.checked)}
        />
      </div>

      {isPast && (
        <Alert tone="info" className="mt-4">
          Dias anteriores são somente leitura.
        </Alert>
      )}

      {overview && (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Cupcakes ativos', value: overview.summary.activeCupcakes, icon: Package },
            { label: 'Unidades disponíveis', value: overview.summary.totalUnits, icon: Warehouse },
            {
              label: 'Estoque baixo',
              value: overview.summary.lowStock,
              icon: AlertTriangle,
              tone: 'text-warning',
            },
            {
              label: 'Esgotados',
              value: overview.summary.soldOut,
              icon: CircleSlash,
              tone: 'text-danger',
            },
            {
              label: 'Sem estoque definido',
              value: overview.summary.notSet,
              icon: Package,
              tone: 'text-subtle',
            },
          ].map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} padded={false} className="flex flex-col gap-1 p-4">
              <dt className="flex items-center gap-2 text-xs text-muted">
                <Icon className={cn('size-4', tone ?? 'text-primary')} aria-hidden="true" />
                {label}
              </dt>
              <dd className="text-2xl font-semibold text-fg tabular-nums">{value}</dd>
            </Card>
          ))}
        </dl>
      )}

      <section className="mt-6" aria-label={`Estoque de ${formatDateOnly(date)}`}>
        {stock.isError ? (
          <ErrorState message={getErrorMessage(stock.error)} onRetry={() => void stock.refetch()} />
        ) : stock.isPending ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Warehouse />}
            title={onlyAlerts ? 'Nenhum alerta de estoque' : 'Nenhum cupcake cadastrado'}
            description={
              onlyAlerts ? 'Todos os cupcakes ativos têm estoque suficiente.' : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">
                Estoque de {formatDateOnly(date)}. Alerta de estoque baixo abaixo de{' '}
                {overview?.lowStockThreshold} unidades.
              </caption>
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cupcake
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Situação
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Atual
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Nova quantidade
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => {
                  const draft = drafts[item.cupcake.id];
                  const invalid = draft !== undefined && parseQuantity(draft) === null;
                  const inputId = `stock-${item.cupcake.id}`;
                  return (
                    <tr
                      key={item.cupcake.id}
                      className={cn(
                        'border-b border-line last:border-0',
                        !item.cupcake.isActive && 'opacity-70',
                        (item.soldOut || item.lowStock) &&
                          item.cupcake.isActive &&
                          'bg-warning/[0.03]',
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CupcakeImage
                            src={item.cupcake.imageUrl}
                            alt=""
                            className="size-10 shrink-0 rounded-lg"
                          />
                          <label htmlFor={inputId} className="min-w-0">
                            <span className="block font-medium text-fg">{item.cupcake.name}</span>
                            <span className="text-xs text-subtle">{item.cupcake.flavor}</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadges item={item} threshold={overview!.lowStockThreshold} />
                      </td>
                      <td className="px-4 py-3 text-right text-base font-semibold tabular-nums">
                        {item.isSet ? item.quantity : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          id={inputId}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={MAX_QUANTITY}
                          step={1}
                          disabled={isPast}
                          placeholder={item.isSet ? String(item.quantity) : '0'}
                          value={draft ?? ''}
                          aria-invalid={invalid || undefined}
                          aria-describedby={invalid ? `${inputId}-error` : undefined}
                          onChange={(event) =>
                            setDrafts((current) => {
                              const next = { ...current };
                              if (event.target.value === '') delete next[item.cupcake.id];
                              else next[item.cupcake.id] = event.target.value;
                              return next;
                            })
                          }
                          className="w-32"
                        />
                        {invalid && (
                          <p id={`${inputId}-error`} className="mt-1 text-xs text-danger-fg">
                            Inteiro de 0 a {MAX_QUANTITY}.
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPast || (item.isSet && item.quantity === 0)}
                          onClick={() => setToZero(item)}
                          aria-label={`Zerar estoque de ${item.cupcake.name}`}
                        >
                          Zerar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {saveAll.isError && (
        <Alert tone="error" className="mt-4">
          {getErrorMessage(saveAll.error)}
        </Alert>
      )}

      {!isPast && overview && (
        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-canvas/90 py-4 backdrop-blur">
          <p className="mr-auto text-sm text-muted" aria-live="polite">
            {invalidDrafts.length
              ? 'Corrija as quantidades inválidas para salvar.'
              : changes.length
                ? `${changes.length} alteração(ões) pendente(s)`
                : 'Nenhuma alteração pendente'}
          </p>
          <Button
            variant="ghost"
            onClick={() => setDrafts({})}
            disabled={!Object.keys(drafts).length || saveAll.isPending}
            leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
          >
            Descartar
          </Button>
          <Button
            onClick={() => saveAll.mutate()}
            loading={saveAll.isPending}
            disabled={!changes.length || invalidDrafts.length > 0}
            leftIcon={<Save className="size-4" aria-hidden="true" />}
          >
            Salvar alterações
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={toZero !== null}
        title={`Zerar o estoque de ${toZero?.cupcake.name ?? ''}?`}
        description="O cupcake aparecerá como esgotado para os clientes neste dia."
        confirmLabel="Zerar estoque"
        tone="danger"
        loading={zero.isPending}
        onConfirm={() => toZero && zero.mutate(toZero)}
        onCancel={() => setToZero(null)}
      />
    </div>
  );
}
