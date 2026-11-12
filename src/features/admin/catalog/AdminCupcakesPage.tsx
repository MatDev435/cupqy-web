import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cookie, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { deleteCupcake, listAdminCategories, listAdminCupcakes } from '@/api/admin';
import type { AdminCupcakesQuery } from '@/api/contract';
import { getErrorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { AdminCupcake } from '@/api/types';
import { CupcakeImage } from '@/components/brand/CupcakeImage';
import {
  Badge,
  Button,
  ButtonLink,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatMoney, plural } from '@/lib/format';

type StatusFilter = NonNullable<AdminCupcakesQuery['status']>;
type SortOption = NonNullable<AdminCupcakesQuery['sort']>;

/** Gestão do catálogo (US15): lista ativos e inativos com busca, filtros e ações. */
export function AdminCupcakesPage() {
  useDocumentTitle('Cupcakes');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('busca') ?? '');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const status = (params.get('status') as StatusFilter | null) ?? 'all';
  const category = params.get('categoria') ?? '';
  const sort = (params.get('ordem') as SortOption | null) ?? 'name';
  const page = Math.max(1, Number(params.get('pagina')) || 1);
  const [toDelete, setToDelete] = useState<AdminCupcake | null>(null);

  const query: AdminCupcakesQuery = {
    search: debouncedSearch || undefined,
    status,
    category: category || undefined,
    sort,
    page,
    pageSize: 20,
  };

  const cupcakes = useQuery({
    queryKey: queryKeys.admin.cupcakes(query),
    queryFn: ({ signal }) => listAdminCupcakes(query, signal),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: ({ signal }) => listAdminCategories(signal),
  });

  const setParam = (key: string, value: string, fallback = '') => {
    const next = new URLSearchParams(params);
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
    if (key !== 'pagina') next.delete('pagina');
    setParams(next, { replace: true });
  };

  const remove = useMutation({
    mutationFn: (cupcake: AdminCupcake) => deleteCupcake(cupcake.id),
    onSuccess: (result, cupcake) => {
      setToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'cupcakes'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
      // US15 RN#01: cupcake já vendido é apenas inativado.
      toast(
        result.deletion === 'soft'
          ? {
              tone: 'info',
              title: `${cupcake.name} foi inativado`,
              description:
                'Ele já possui vendas, então saiu do catálogo e o histórico foi preservado.',
            }
          : { tone: 'success', title: `${cupcake.name} foi excluído.` },
      );
    },
    onError: (error) => {
      setToDelete(null);
      toast({
        tone: 'error',
        title: 'Não foi possível excluir',
        description: getErrorMessage(error),
      });
    },
  });

  const list = cupcakes.data?.data ?? [];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Cupcakes"
        description="Cadastre, edite e organize o cardápio."
        actions={
          <ButtonLink
            to="/admin/cupcakes/novo"
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
          >
            Adicionar cupcake
          </ButtonLink>
        }
      />

      <div role="search" className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <label htmlFor="admin-cupcake-search" className="sr-only">
          Buscar pelo nome
        </label>
        <Input
          id="admin-cupcake-search"
          type="search"
          placeholder="Buscar pelo nome…"
          leftIcon={<Search />}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            if (page > 1) setParam('pagina', '');
          }}
        />
        <label htmlFor="admin-cupcake-status" className="sr-only">
          Situação
        </label>
        <Select
          id="admin-cupcake-status"
          value={status}
          onChange={(event) => setParam('status', event.target.value, 'all')}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </Select>
        <label htmlFor="admin-cupcake-category" className="sr-only">
          Categoria
        </label>
        <Select
          id="admin-cupcake-category"
          value={category}
          onChange={(event) => setParam('categoria', event.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.data?.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
        <label htmlFor="admin-cupcake-sort" className="sr-only">
          Ordenar por
        </label>
        <Select
          id="admin-cupcake-sort"
          value={sort}
          onChange={(event) => setParam('ordem', event.target.value, 'name')}
        >
          <option value="name">Nome</option>
          <option value="newest">Mais recentes</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
        </Select>
      </div>

      <section
        className="mt-6"
        aria-label="Cupcakes cadastrados"
        aria-busy={cupcakes.isFetching || undefined}
      >
        {cupcakes.isError ? (
          <ErrorState
            message={getErrorMessage(cupcakes.error)}
            onRetry={() => void cupcakes.refetch()}
          />
        ) : cupcakes.isPending ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Cookie />}
            title={
              debouncedSearch || status !== 'all' || category
                ? 'Nenhum cupcake encontrado'
                : 'Nenhum cupcake cadastrado'
            }
            description="Cadastre o primeiro cupcake do cardápio."
            action={<ButtonLink to="/admin/cupcakes/novo">Adicionar cupcake</ButtonLink>}
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted" aria-live="polite">
              {plural(cupcakes.data.meta.total, 'cupcake', 'cupcakes')}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[44rem] text-sm">
                <caption className="sr-only">Cupcakes cadastrados</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Cupcake
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Categoria
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Preço
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Estoque hoje
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Situação
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((cupcake) => (
                    <tr
                      key={cupcake.id}
                      className="border-b border-line last:border-0 hover:bg-elevated/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CupcakeImage
                            src={cupcake.imageUrl}
                            alt=""
                            className="size-12 shrink-0 rounded-lg"
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/admin/cupcakes/${cupcake.id}`}
                              className="font-medium text-fg hover:text-primary"
                            >
                              {cupcake.name}
                            </Link>
                            <p className="text-xs text-subtle">{cupcake.flavor}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{cupcake.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(cupcake.priceCents)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {cupcake.stock.soldOut ? (
                          <Badge tone="danger">Esgotado</Badge>
                        ) : (
                          cupcake.stock.available
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={cupcake.isActive ? 'success' : 'neutral'} dot>
                          {cupcake.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <ButtonLink
                            to={`/admin/cupcakes/${cupcake.id}`}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar ${cupcake.name}`}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </ButtonLink>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="hover:text-danger-fg"
                            onClick={() => setToDelete(cupcake)}
                            aria-label={`Excluir ${cupcake.name}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              className="mt-6"
              page={page}
              totalPages={cupcakes.data.meta.totalPages}
              onPageChange={(next) => setParam('pagina', String(next), '1')}
            />
          </>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Excluir ${toDelete?.name ?? 'cupcake'}?`}
        description="Se ele já tiver sido vendido, será apenas inativado para preservar o histórico de pedidos."
        confirmLabel="Excluir"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
