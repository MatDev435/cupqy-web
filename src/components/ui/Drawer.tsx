import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

/** Painel lateral (menu móvel) sobre <dialog> nativo: foco preso, Esc e retorno de foco. */
export function Drawer({ open, onClose, title, children, side = 'left', className }: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
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
      onCancel={(event) => {
        event.preventDefault();
        onCloseRef.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
      className={cn(
        'm-0 h-dvh max-h-dvh w-[min(22rem,88vw)] max-w-none bg-transparent p-0 text-fg backdrop:animate-fade-in',
        side === 'left' ? 'mr-auto' : 'ml-auto',
      )}
    >
      <div
        className={cn(
          'flex h-full flex-col border-line-strong bg-surface shadow-pop',
          side === 'left' ? 'border-r' : 'border-l',
          'animate-slide-in-right',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-display text-lg font-semibold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onCloseRef.current()}
            aria-label="Fechar menu"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
