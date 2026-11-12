import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, Modal } from './Modal';

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Detalhes" description="Descrição">
        <p>Conteúdo</p>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('abre com título acessível e fecha pelo botão', async () => {
    render(<ModalHarness />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const dialog = screen.getByRole('dialog', { name: 'Detalhes' });
    expect(dialog).toHaveAccessibleDescription('Descrição');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('devolve o foco ao elemento que abriu', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(trigger).toHaveFocus();
  });
});

describe('ConfirmDialog', () => {
  it('confirma e cancela', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Sair da conta?"
        confirmLabel="Sair"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('bloqueia o fechamento enquanto carrega', () => {
    render(<ConfirmDialog open title="Excluir?" loading onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled();
  });
});
