import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import {
  createCupcake,
  getAdminCupcake,
  listAdminCategories,
  listAdminDietaryTags,
  updateCupcake,
} from '@/api/admin';
import { getErrorMessage, getFieldErrors } from '@/api/errors';
import { isApiError } from '@/api/http';
import { queryKeys } from '@/api/queryKeys';
import type { AdminCupcake } from '@/api/types';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SelectField,
  Switch,
  TextareaField,
  TextField,
  useToast,
} from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CupcakeImageUploader } from './CupcakeImageUploader';
import {
  NUTRITION_FIELDS,
  cupcakeSchema,
  toCupcakeBody,
  toFormValues,
  type CupcakeFormValues,
} from './cupcakeSchema';

function CupcakeForm({ cupcake }: { cupcake?: AdminCupcake }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});
  const categories = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: ({ signal }) => listAdminCategories(signal),
  });
  const tags = useQuery({
    queryKey: queryKeys.admin.dietaryTags,
    queryFn: ({ signal }) => listAdminDietaryTags(signal),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CupcakeFormValues>({
    resolver: zodResolver(cupcakeSchema),
    defaultValues: toFormValues(cupcake),
  });

  const save = useMutation({
    mutationFn: (values: CupcakeFormValues) => {
      const body = toCupcakeBody(values);
      return cupcake ? updateCupcake(cupcake.id, body) : createCupcake(body);
    },
    onSuccess: (saved) => {
      setServerFieldErrors({});
      queryClient.setQueryData(queryKeys.admin.cupcake(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'cupcakes'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all });
      if (cupcake) {
        reset(toFormValues(saved));
        toast({ tone: 'success', title: 'Cupcake atualizado.' });
      } else {
        toast({
          tone: 'success',
          title: 'Cupcake cadastrado!',
          description: 'Agora adicione uma foto para exibi-lo no catálogo.',
        });
        navigate(`/admin/cupcakes/${saved.id}`, { replace: true });
      }
    },
    onError: (error) => setServerFieldErrors(getFieldErrors(error)),
  });

  const fieldError = (name: string, local?: string) => local ?? serverFieldErrors[name];

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(values))}
      noValidate
      className="flex flex-col gap-6"
    >
      {save.isError && (
        <Alert tone="error" title="Não foi possível salvar">
          {isApiError(save.error, 'VALIDATION_ERROR')
            ? 'Revise os campos destacados.'
            : getErrorMessage(save.error)}
        </Alert>
      )}

      <Card>
        <CardHeader title="Informações" />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Nome"
            required
            error={fieldError('name', errors.name?.message)}
            {...register('name')}
          />
          <TextField
            label="Sabor"
            required
            placeholder="Chocolate, Morango…"
            error={fieldError('flavor', errors.flavor?.message)}
            {...register('flavor')}
          />
          <TextareaField
            className="md:col-span-2"
            label="Descrição"
            required
            rows={3}
            maxLength={1000}
            error={fieldError('description', errors.description?.message)}
            {...register('description')}
          />
          <TextareaField
            className="md:col-span-2"
            label="Ingredientes"
            required
            rows={3}
            maxLength={1000}
            error={fieldError('ingredients', errors.ingredients?.message)}
            {...register('ingredients')}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Preço, tamanho e categoria" />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Preço (R$)"
            required
            inputMode="decimal"
            placeholder="12,90"
            error={fieldError('priceCents', errors.price?.message)}
            {...register('price')}
          />
          <SelectField
            label="Categoria"
            optional
            error={fieldError('categoryId', errors.categoryId?.message)}
            {...register('categoryId')}
          >
            <option value="">Sem categoria</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Peso médio (g)"
            optional
            inputMode="numeric"
            error={fieldError('weightGrams', errors.weightGrams?.message)}
            {...register('weightGrams')}
          />
          <TextField
            label="Tamanho"
            optional
            placeholder="Médio (7 cm)"
            error={fieldError('size', errors.size?.message)}
            {...register('size')}
          />
        </div>

        <fieldset className="mt-6">
          <legend className="mb-3 text-sm font-medium text-fg">Características alimentares</legend>
          {tags.data?.length ? (
            <Controller
              control={control}
              name="dietaryTagIds"
              render={({ field }) => (
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {tags.data.map((tag) => (
                    <Checkbox
                      key={tag.id}
                      label={tag.name}
                      checked={field.value.includes(tag.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...field.value, tag.id]
                            : field.value.filter((id) => id !== tag.id),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            />
          ) : (
            <p className="text-sm text-subtle">Nenhuma restrição cadastrada.</p>
          )}
        </fieldset>

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Switch
              className="mt-6 rounded-xl border border-line p-4"
              label="Ativo no catálogo"
              description="Cupcakes inativos não aparecem para os clientes."
              checked={field.value}
              onChange={(event) => field.onChange(event.target.checked)}
            />
          )}
        />
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer font-display text-lg font-semibold">
            Tabela nutricional{' '}
            <span className="text-sm font-normal text-subtle">(opcional, por unidade)</span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {NUTRITION_FIELDS.map((field) => (
              <TextField
                key={field.key}
                label={`${field.label} (${field.unit})`}
                inputMode="decimal"
                error={errors.nutrition?.[field.key]?.message}
                {...register(`nutrition.${field.key}`)}
              />
            ))}
          </div>
        </details>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ButtonLink to="/admin/cupcakes" variant="ghost">
          {cupcake ? 'Voltar' : 'Cancelar'}
        </ButtonLink>
        <Button type="submit" loading={save.isPending} disabled={Boolean(cupcake) && !isDirty}>
          {cupcake ? 'Salvar alterações' : 'Cadastrar cupcake'}
        </Button>
      </div>
    </form>
  );
}

/** Cadastro e edição de cupcakes (US15). */
export function AdminCupcakeFormPage() {
  const { cupcakeId } = useParams();
  const isNew = !cupcakeId;
  const cupcake = useQuery({
    queryKey: queryKeys.admin.cupcake(cupcakeId ?? ''),
    queryFn: ({ signal }) => getAdminCupcake(cupcakeId!, signal),
    enabled: !isNew,
  });
  useDocumentTitle(isNew ? 'Novo cupcake' : (cupcake.data?.name ?? 'Editar cupcake'));

  const back = (
    <ButtonLink
      to="/admin/cupcakes"
      variant="ghost"
      size="sm"
      className="-ml-2"
      leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
    >
      Cupcakes
    </ButtonLink>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {back}
      <PageHeader
        className="mt-3 mb-6"
        title={isNew ? 'Novo cupcake' : (cupcake.data?.name ?? 'Editar cupcake')}
        description={
          isNew
            ? 'Preencha as informações. A foto pode ser enviada logo depois do cadastro.'
            : 'Atualize as informações e a foto do cupcake.'
        }
      />
      {isNew ? (
        <CupcakeForm />
      ) : cupcake.isPending ? (
        <LoadingState label="Carregando cupcake…" />
      ) : cupcake.isError ? (
        isApiError(cupcake.error, ['CUPCAKE_NOT_FOUND', 'NOT_FOUND']) ? (
          <EmptyState title="Cupcake não encontrado" action={back} />
        ) : (
          <ErrorState
            message={getErrorMessage(cupcake.error)}
            onRetry={() => void cupcake.refetch()}
          />
        )
      ) : (
        <div className="flex flex-col gap-6">
          <CupcakeImageUploader cupcake={cupcake.data} />
          <CupcakeForm key={cupcake.data.id} cupcake={cupcake.data} />
        </div>
      )}
    </div>
  );
}
