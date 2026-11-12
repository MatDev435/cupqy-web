import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/** Bloco de carregamento com brilho (decorativo — combine com um texto role="status"). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden="true" />;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div
          className="mb-1 flex size-14 items-center justify-center rounded-full bg-elevated text-primary [&>svg]:size-7"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** Erro ao carregar dados, com opção de tentar novamente. */
export function ErrorState({
  title = 'Não foi possível carregar',
  message = 'Verifique sua conexão e tente novamente.',
  onRetry,
  retrying,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-6 py-12 text-center',
        className,
      )}
    >
      <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          loading={retrying}
          leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
          className="mt-1"
        >
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
