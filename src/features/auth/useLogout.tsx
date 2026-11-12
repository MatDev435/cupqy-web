import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog, useToast } from '@/components/ui';
import { useAuth } from './authContext';

/** Logout com confirmação (US03 CA#02) e redirecionamento para a home pública (CA#05). */
export function useLogout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await signOut();
      setOpen(false);
      // replace: o botão "voltar" não reabre telas restritas (CA#04).
      navigate('/', { replace: true });
      toast({ tone: 'info', title: 'Você saiu da sua conta.' });
    } finally {
      setPending(false);
    }
  };

  const dialog = (
    <ConfirmDialog
      open={open}
      title="Sair da conta?"
      description="Você precisará entrar novamente para acompanhar seus pedidos."
      confirmLabel="Sair"
      loading={pending}
      onConfirm={() => void confirm()}
      onCancel={() => setOpen(false)}
    />
  );

  return { requestLogout: () => setOpen(true), logoutDialog: dialog };
}
