import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import { isApiError } from '@/api/http';
import { deleteMe } from '@/api/profile';
import { Alert, Button, Card, CardHeader, Modal, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/authContext';
import { PasswordField } from '@/features/auth/components/PasswordField';

/** Exclusão de conta (US04 / LGPD). A API reconfirma a senha e verifica pedidos em andamento. */
export function DeleteAccountCard() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();

  const mutation = useMutation({
    mutationFn: () => deleteMe({ password }),
    onSuccess: async () => {
      setOpen(false);
      await signOut().catch(() => undefined);
      // US04 CA#05: deslogado, tokens limpos e redirecionado à página inicial com confirmação.
      navigate('/', { replace: true });
      toast({
        tone: 'success',
        title: 'Sua conta foi excluída.',
        description: 'Seus dados pessoais foram removidos. Obrigado por ter sido Cupqy!',
        duration: 8000,
      });
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    setOpen(false);
    setPassword('');
    setFieldError(undefined);
    mutation.reset();
  };

  const submit = () => {
    if (!password) {
      setFieldError('Informe sua senha atual para confirmar a exclusão.');
      return;
    }
    setFieldError(undefined);
    mutation.mutate();
  };

  const wrongPassword = isApiError(mutation.error, 'INVALID_PASSWORD');
  const activeOrders = isApiError(mutation.error, 'ACTIVE_ORDERS_PENDING');

  return (
    <Card className="border-danger/25">
      <CardHeader
        title="Excluir conta"
        description="Remove permanentemente seus dados pessoais do Cupqy."
      />
      <Button variant="danger" onClick={() => setOpen(true)}>
        Excluir conta
      </Button>

      <Modal
        open={open}
        onClose={close}
        dismissible={!mutation.isPending}
        title="Excluir sua conta?"
        description="Esta ação é permanente e não pode ser desfeita."
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={submit} loading={mutation.isPending}>
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex gap-3 rounded-xl border border-danger/30 bg-danger/8 p-4 text-sm text-muted">
            <TriangleAlert className="size-5 shrink-0 text-danger" aria-hidden="true" />
            <ul className="list-disc space-y-1 pl-4">
              <li>Nome, e-mail, telefone e endereços salvos serão apagados ou anonimizados.</li>
              <li>Você perderá o acesso ao histórico de pedidos.</li>
              <li>Registros de vendas são mantidos de forma anônima, como exige a lei.</li>
            </ul>
          </div>
          {activeOrders && (
            <Alert tone="warning" title="Você tem pedidos em andamento">
              A exclusão fica bloqueada até que eles sejam concluídos ou cancelados.{' '}
              <Link to="/pedidos?escopo=ativos" onClick={close}>
                Ver pedidos
              </Link>
            </Alert>
          )}
          {mutation.isError && !wrongPassword && !activeOrders && (
            <Alert tone="error">{getErrorMessage(mutation.error)}</Alert>
          )}
          <PasswordField
            label="Senha atual"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={
              fieldError ??
              (wrongPassword
                ? 'Senha incorreta. Não foi possível prosseguir com a exclusão.'
                : undefined)
            }
          />
        </form>
      </Modal>
    </Card>
  );
}
