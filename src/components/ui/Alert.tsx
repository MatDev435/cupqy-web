import type { ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AlertTone = 'success' | 'info' | 'warning' | 'error';

const tones: Record<AlertTone, { icon: typeof Info; box: string; icon_: string }> = {
  success: { icon: CheckCircle2, box: 'border-success/35 bg-success/8', icon_: 'text-success' },
  info: { icon: Info, box: 'border-secondary/35 bg-secondary/8', icon_: 'text-secondary' },
  warning: { icon: TriangleAlert, box: 'border-warning/35 bg-warning/8', icon_: 'text-warning' },
  error: { icon: XCircle, box: 'border-danger/40 bg-danger/8', icon_: 'text-danger' },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
  /**
   * Anuncia a mensagem ao aparecer. Por padrão, erros e avisos usam role="alert" e os demais
   * role="status". Use false para mensagens estáticas (presentes desde o carregamento da página).
   */
  live?: boolean;
}

/** Mensagem de feedback em linha (estados da brand board: sucesso, info, aviso e erro). */
export function Alert({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  className,
  live = true,
}: AlertProps) {
  const { icon: Icon, box, icon_ } = tones[tone];
  const role = live ? (tone === 'error' || tone === 'warning' ? 'alert' : 'status') : undefined;

  return (
    <div
      role={role}
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', box, className)}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', icon_)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="font-medium text-fg">{title}</p>}
        {children && (
          <div className="text-muted [&_a]:text-primary [&_a]:underline">{children}</div>
        )}
        {action && <div className="mt-1.5">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-mt-0.5 -mr-1 rounded-lg p-1 text-muted hover:bg-white/5 hover:text-fg"
          aria-label="Fechar mensagem"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
