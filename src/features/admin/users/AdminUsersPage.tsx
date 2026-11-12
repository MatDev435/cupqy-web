import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { changeUserRole, listUsers } from '@/api/admin';
import type { AdminUsersQuery } from '@/api/contract';
import { getErrorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import type { AdminUser, Role } from '@/api/types';
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  Switch,
  useToast,
} from '@/components/ui';
import { useAuth } from '@/features/auth/authContext';
import { ROLE_LABELS } from '@/features/auth/roles';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate, formatPhone } from '@/lib/format';

const ROLE_TONES = { CUSTOMER: 'neutral', BAKER: 'secondary', ADMIN: 'primary' } as const;

/** Usuários e papéis. A API impede alterar o próprio papel e ficar sem administrador. */
export function AdminUsersPage() {
  useDocumentTitle('Usuários');
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const [role, setRole] = useState<Role | ''>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ user: AdminUser; role: Role } | null>(null);

  const query: AdminUsersQuery = {
    search: debouncedSearch || undefined,
    role: role || undefined,
    includeDeleted: includeDeleted ? 'true' : undefined,
    page,
    pageSize: 20,
  };
  const users = useQuery({
    queryKey: queryKeys.admin.users(query),
    queryFn: ({ signal }) => listUsers(query, signal),
    placeholderData: keepPreviousData,
  });

  const change = useMutation({
    mutationFn: ({ user, role: next }: { user: AdminUser; role: Role }) =>
      changeUserRole(user.id, { role: next }),
    onSuccess: (updated) => {
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast({
        tone: 'success',
        title: 'Papel atualizado',
        description: `${updated.fullName ?? updated.email} agora é ${ROLE_LABELS[updated.role]}.`,
      });
    },
    onError: (error) => {
      setPending(null);
      // 422: CANNOT_CHANGE_OWN_ROLE, LAST_ADMIN ou USER_DELETED — mensagem vinda da API.
      toast({ tone: 'error', title: 'Alteração recusada', description: getErrorMessage(error) });
    },
  });

  const list = users.data?.data ?? [];

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Usuários"
        description="Consulte contas e defina quem é confeiteiro ou administrador."
      />

      <div role="search" className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <label htmlFor="users-search" className="sr-only">
          Buscar por nome ou e-mail
        </label>
        <Input
          id="users-search"
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          leftIcon={<Search />}
          className="flex-1"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <label htmlFor="users-role" className="sr-only">
          Papel
        </label>
        <Select
          id="users-role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as Role | '');
            setPage(1);
          }}
          className="md:w-52"
        >
          <option value="">Todos os papéis</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Switch
          label="Incluir contas encerradas"
          checked={includeDeleted}
          onChange={(event) => {
            setIncludeDeleted(event.target.checked);
            setPage(1);
          }}
        />
      </div>

      <section className="mt-6" aria-label="Usuários" aria-busy={users.isFetching || undefined}>
        {users.isError ? (
          <ErrorState message={getErrorMessage(users.error)} onRetry={() => void users.refetch()} />
        ) : users.isPending ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : list.length === 0 ? (
          <EmptyState icon={<Users />} title="Nenhum usuário encontrado" />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
              <table className="w-full min-w-[44rem] text-sm">
                <caption className="sr-only">Usuários</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-subtle uppercase">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Usuário
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Telefone
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Cadastro
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Papel
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((user) => {
                    const isSelf = user.id === profile?.id;
                    const selectId = `role-${user.id}`;
                    return (
                      <tr key={user.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3">
                          <p className="flex items-center gap-2 font-medium text-fg">
                            {user.fullName ?? 'Sem nome'}
                            {isSelf && <Badge tone="primary">Você</Badge>}
                            {user.deleted && <Badge tone="danger">Encerrada</Badge>}
                          </p>
                          <p className="text-xs text-subtle">{user.email ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {user.phone ? formatPhone(user.phone) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-3">
                          {isSelf || user.deleted ? (
                            <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                          ) : (
                            <>
                              <label htmlFor={selectId} className="sr-only">
                                Papel de {user.fullName ?? user.email}
                              </label>
                              <Select
                                id={selectId}
                                value={user.role}
                                className="w-44"
                                disabled={change.isPending}
                                onChange={(event) =>
                                  setPending({ user, role: event.target.value as Role })
                                }
                              >
                                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </Select>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              className="mt-6"
              page={page}
              totalPages={users.data.meta.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      <ConfirmDialog
        open={pending !== null}
        title="Alterar papel?"
        description={
          pending
            ? `${pending.user.fullName ?? pending.user.email} passará de ${ROLE_LABELS[pending.user.role]} para ${ROLE_LABELS[pending.role]}.`
            : undefined
        }
        confirmLabel="Alterar papel"
        loading={change.isPending}
        onConfirm={() => pending && change.mutate(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
