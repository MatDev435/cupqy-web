import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Impede fechar por Esc/clique fora (ex.: durante uma operação em andamento). */
  dismissible?: boolean;
  className?: string;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

/**
 * Diálogo modal baseado no elemento nativo <dialog>: o navegador prende o foco, trata o Esc e
 * coloca o conteúdo na camada superior. O foco volta ao elemento que abriu o modal.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
  className,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      // Devolve o foco a quem abriu o diálogo (o elemento pode ter sido desmontado).
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    // O clique no backdrop é um atalho de mouse; pelo teclado o Esc fecha (evento cancel nativo).
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onCloseRef.current();
      }}
      onClick={(event) => {
        // Clique no backdrop (fora da caixa de conteúdo).
        if (dismissible && event.target === event.currentTarget) onCloseRef.current();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] animate-slide-up overflow-visible bg-transparent p-0 text-fg backdrop:animate-fade-in',
        sizes[size],
      )}
    >
      <div
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] flex-col rounded-2xl border border-line-strong bg-surface shadow-pop',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
          <div className="flex flex-col gap-1.5">
            <h2 id={titleId} className="font-display text-xl font-semibold text-fg">
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="text-sm text-muted">
                {description}
              </div>
            )}
          </div>
          {dismissible && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onCloseRef.current()}
              aria-label="Fechar"
              className="-mt-1 -mr-2 shrink-0"
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
          )}
        </header>
        {children && <div className="overflow-y-auto px-6 py-3">{children}</div>}
        {footer && (
          <footer className="flex flex-col-reverse gap-2 px-6 pt-3 pb-6 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmação de ações importantes (excluir, sair, cancelar pedido…). */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Voltar',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
