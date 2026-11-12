import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Leaf, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { z } from 'zod';
import {
  createCategory,
  createDietaryTag,
  deleteCategory,
  deleteDietaryTag,
  listAdminCategories,
  listAdminDietaryTags,
  updateCategory,
  updateDietaryTag,
} from '@/api/admin';
import { getErrorMessage } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageHeader,
  TextareaField,
  TextField,
  useToast,
} from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface TaxonomyConfig {
  kind: 'category' | 'dietaryTag';
  title: string;
  description: string;
  singular: string;
  hasDescription: boolean;
  queryKey: readonly string[];
  list: (signal?: AbortSignal) => Promise<TaxonomyItem[]>;
  create: (values: { name: string; description: string | null }) => Promise<TaxonomyItem>;
  update: (
    id: string,
    values: { name: string; description: string | null },
  ) => Promise<TaxonomyItem>;
  remove: (id: string) => Promise<void>;
  removeHint: string;
}

const CONFIGS: Record<TaxonomyConfig['kind'], TaxonomyConfig> = {
  category: {
    kind: 'category',
    title: 'Categorias',
    description: 'Organizam o cardápio e os filtros do catálogo.',
    singular: 'categoria',
    hasDescription: true,
    queryKey: queryKeys.admin.categories,
    list: listAdminCategories,
    create: ({ name, description }) => createCategory({ name, description }),
    update: (id, { name, description }) => updateCategory(id, { name, description }),
    remove: deleteCategory,
    removeHint: 'Só é possível remover categorias sem cupcakes vinculados.',
  },
  dietaryTag: {
    kind: 'dietaryTag',
    title: 'Restrições alimentares',
    description: 'Características como Sem Lactose, Sem Glúten e Vegano.',
    singular: 'restrição',
    hasDescription: false,
    queryKey: queryKeys.admin.dietaryTags,
    list: listAdminDietaryTags,
    create: ({ name }) => createDietaryTag({ name }),
    update: (id, { name }) => updateDietaryTag(id, { name }),
    remove: deleteDietaryTag,
    removeHint: 'A restrição também será removida dos cupcakes que a utilizam.',
  },
};

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe o nome (mínimo de 2 caracteres).')
    .max(60, 'Use no máximo 60 caracteres.'),
  description: z.string().trim().max(255, 'Use no máximo 255 caracteres.'),
});
type FormValues = z.infer<typeof schema>;

function TaxonomyForm({
  config,
  item,
  onSubmit,
  onCancel,
  saving,
  error,
}: {
  config: TaxonomyConfig;
  item: TaxonomyItem | null;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
  saving: boolean;
  error: unknown;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: item?.name ?? '', description: item?.description ?? '' },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {Boolean(error) && <Alert tone="error">{getErrorMessage(error)}</Alert>}
      <TextField
        label="Nome"
        required
        autoFocus
        error={errors.name?.message}
        {...register('name')}
      />
      {config.hasDescription && (
        <TextareaField
          label="Descrição"
          optional
          rows={3}
          maxLength={255}
          error={errors.description?.message}
          {...register('description')}
        />
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          {item ? 'Salvar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}

/** Gestão de categorias ou restrições alimentares (US15). */
export function TaxonomyPage({ kind }: { kind: TaxonomyConfig['kind'] }) {
  const config = CONFIGS[kind];
  useDocumentTitle(config.title);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<TaxonomyItem | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<TaxonomyItem | null>(null);

  const items = useQuery({
    queryKey: config.queryKey,
    queryFn: ({ signal }) => config.list(signal),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: config.queryKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'cupcakes'] });
  };

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = { name: values.name.trim(), description: values.description.trim() || null };
      return editing && editing !== 'new'
        ? config.update(editing.id, payload)
        : config.create(payload);
    },
    onSuccess: (saved) => {
      invalidate();
      const label = config.singular.charAt(0).toUpperCase() + config.singular.slice(1);
      toast({
        tone: 'success',
        title: `${label} ${editing === 'new' ? 'criada' : 'atualizada'}`,
        description: saved.name,
      });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: (item: TaxonomyItem) => config.remove(item.id),
    onSuccess: (_result, item) => {
      invalidate();
      setToDelete(null);
      toast({ tone: 'success', title: 'Removida com sucesso', description: item.name });
    },
    onError: (error) => {
      setToDelete(null);
      // Ex.: 409 CATEGORY_IN_USE — mensagem vinda da API.
      toast({
        tone: 'error',
        title: 'Não foi possível remover',
        description: getErrorMessage(error),
      });
    },
  });

  const Icon = kind === 'category' ? Tags : Leaf;
  const list = items.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button
            onClick={() => {
              save.reset();
              setEditing('new');
            }}
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
          >
            Nova {config.singular}
          </Button>
        }
      />

      <section className="mt-6" aria-label={config.title}>
        {items.isPending ? (
          <LoadingState />
        ) : items.isError ? (
          <ErrorState message={getErrorMessage(items.error)} onRetry={() => void items.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState icon={<Icon />} title={`Nenhuma ${config.singular} cadastrada`} />
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {list.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">{item.name}</p>
                  <p className="truncate text-xs text-subtle">
                    {item.slug}
                    {item.description ? ` · ${item.description}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    save.reset();
                    setEditing(item);
                  }}
                  aria-label={`Editar ${item.name}`}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:text-danger-fg"
                  onClick={() => setToDelete(item)}
                  aria-label={`Remover ${item.name}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        dismissible={!save.isPending}
        title={editing === 'new' ? `Nova ${config.singular}` : `Editar ${config.singular}`}
        size="sm"
      >
        {editing !== null && (
          <TaxonomyForm
            config={config}
            item={editing === 'new' ? null : editing}
            onSubmit={(values) => save.mutate(values)}
            onCancel={() => setEditing(null)}
            saving={save.isPending}
            error={save.error}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Remover ${toDelete?.name ?? ''}?`}
        description={config.removeHint}
        confirmLabel="Remover"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export function AdminCategoriesPage() {
  return <TaxonomyPage kind="category" />;
}

export function AdminDietaryTagsPage() {
  return <TaxonomyPage kind="dietaryTag" />;
}
