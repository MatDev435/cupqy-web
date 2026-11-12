import { useState } from 'react';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import type { Address } from '@/api/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  useToast,
} from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCep } from '@/lib/format';
import { AccountLayout } from '../components/AccountLayout';
import { AddressForm } from '../components/AddressForm';
import { AddressSummary } from '../components/AddressSummary';
import { useAddressMutations, useAddresses } from '../hooks';
import { toAddressPayload, type AddressFormValues } from '../schemas';

const MAX_ADDRESSES = 10;

type Editing = { mode: 'create' } | { mode: 'edit'; address: Address } | null;

export function AddressesPage() {
  useDocumentTitle('Endereços');
  const { toast } = useToast();
  const addresses = useAddresses();
  const { create, update, remove } = useAddressMutations();
  const [editing, setEditing] = useState<Editing>(null);
  const [makeDefault, setMakeDefault] = useState(false);
  const [toDelete, setToDelete] = useState<Address | null>(null);

  const list = addresses.data ?? [];
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  const openCreate = () => {
    create.reset();
    setMakeDefault(list.length === 0);
    setEditing({ mode: 'create' });
  };

  const save = async (values: AddressFormValues) => {
    const payload = { ...toAddressPayload(values), label: values.label?.trim() || null };
    if (editing?.mode === 'edit') {
      await update.mutateAsync({ id: editing.address.id, body: payload });
      toast({ tone: 'success', title: 'Endereço atualizado.' });
    } else {
      await create.mutateAsync({ ...payload, isDefault: makeDefault });
      toast({ tone: 'success', title: 'Endereço salvo.' });
    }
    setEditing(null);
  };

  return (
    <AccountLayout
      title="Endereços"
      description="Endereços salvos agilizam o checkout das próximas compras."
      actions={
        list.length > 0 && (
          <Button
            onClick={openCreate}
            disabled={list.length >= MAX_ADDRESSES}
            leftIcon={<Plus className="size-4" aria-hidden="true" />}
          >
            Novo endereço
          </Button>
        )
      }
    >
      {addresses.isPending ? (
        <LoadingState label="Carregando endereços…" />
      ) : addresses.isError ? (
        <ErrorState
          message={getErrorMessage(addresses.error)}
          onRetry={() => void addresses.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<MapPin />}
          title="Nenhum endereço salvo"
          description="Cadastre um endereço para calcular o frete mais rápido no checkout."
          action={
            <Button onClick={openCreate} leftIcon={<Plus className="size-4" aria-hidden="true" />}>
              Cadastrar endereço
            </Button>
          }
        />
      ) : (
        <>
          {list.length >= MAX_ADDRESSES && (
            <Alert tone="info">Você atingiu o limite de {MAX_ADDRESSES} endereços salvos.</Alert>
          )}
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((address) => (
              <li key={address.id}>
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-fg">
                      {address.label || `CEP ${formatCep(address.zipCode)}`}
                    </h2>
                    {address.isDefault && (
                      <Badge tone="primary" icon={<Star />}>
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <AddressSummary address={address} />
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Pencil className="size-4" aria-hidden="true" />}
                      onClick={() => {
                        update.reset();
                        setEditing({ mode: 'edit', address });
                      }}
                      aria-label={`Editar endereço ${address.label ?? address.street}`}
                    >
                      Editar
                    </Button>
                    {!address.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={update.isPending && update.variables?.id === address.id}
                        onClick={() =>
                          update.mutate(
                            { id: address.id, body: { isDefault: true } },
                            {
                              onSuccess: () =>
                                toast({ tone: 'success', title: 'Endereço padrão definido.' }),
                            },
                          )
                        }
                      >
                        Tornar padrão
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hover:text-danger-fg"
                      leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
                      onClick={() => setToDelete(address)}
                      aria-label={`Remover endereço ${address.label ?? address.street}`}
                    >
                      Remover
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        dismissible={!saving}
        title={editing?.mode === 'edit' ? 'Editar endereço' : 'Novo endereço'}
        size="lg"
      >
        {saveError && (
          <Alert tone="error" className="mb-4">
            {getErrorMessage(saveError)}
          </Alert>
        )}
        {editing && (
          <AddressForm
            idPrefix="address"
            showLabel
            submitLabel={editing.mode === 'edit' ? 'Salvar alterações' : 'Salvar endereço'}
            submitting={saving}
            onCancel={() => setEditing(null)}
            defaultValues={
              editing.mode === 'edit'
                ? {
                    ...editing.address,
                    label: editing.address.label ?? '',
                    complement: editing.address.complement ?? '',
                    zipCode: formatCep(editing.address.zipCode),
                    state: editing.address.state as AddressFormValues['state'],
                  }
                : undefined
            }
            onSubmit={(values) => save(values).catch(() => undefined)}
          >
            {editing.mode === 'create' && (
              <Checkbox
                label="Usar como endereço padrão"
                checked={makeDefault}
                onChange={(event) => setMakeDefault(event.target.checked)}
              />
            )}
          </AddressForm>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Remover endereço?"
        description={toDelete ? `${toDelete.street}, ${toDelete.number}` : undefined}
        confirmLabel="Remover"
        tone="danger"
        loading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast({ tone: 'success', title: 'Endereço removido.' });
              setToDelete(null);
            },
            onError: (error) => {
              toast({
                tone: 'error',
                title: 'Não foi possível remover',
                description: getErrorMessage(error),
              });
              setToDelete(null);
            },
          })
        }
      />
    </AccountLayout>
  );
}
