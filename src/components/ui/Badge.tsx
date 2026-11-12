import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, { soft: string; dot: string }> = {
  neutral: { soft: 'border-line-strong bg-elevated text-muted', dot: 'bg-muted' },
  primary: { soft: 'border-primary/30 bg-primary/12 text-primary-fg', dot: 'bg-primary' },
  secondary: { soft: 'border-secondary/30 bg-secondary/12 text-secondary-fg', dot: 'bg-secondary' },
  success: { soft: 'border-success/30 bg-success/10 text-success-fg', dot: 'bg-success' },
  warning: { soft: 'border-warning/30 bg-warning/10 text-warning-fg', dot: 'bg-warning' },
  danger: { soft: 'border-danger/35 bg-danger/10 text-danger-fg', dot: 'bg-danger' },
  info: { soft: 'border-info/30 bg-info/10 text-info-fg', dot: 'bg-info' },
};

interface BadgeProps extends ComponentProps<'span'> {
  tone?: BadgeTone;
  /** Ponto colorido antes do texto (tags de status da brand board). */
  dot?: boolean;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

/** Tag/badge. O texto sempre acompanha a cor — a informação nunca depende só da cor. */
export function Badge({
  tone = 'neutral',
  dot = false,
  icon,
  size = 'sm',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        tones[tone].soft,
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('size-1.5 rounded-full', tones[tone].dot)} aria-hidden="true" />}
      {icon && (
        <span className="flex [&>svg]:size-3.5" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

interface ChipProps extends ComponentProps<'button'> {
  selected?: boolean;
  icon?: ReactNode;
}

/** Filtro rápido alternável (aria-pressed). */
export function Chip({ selected = false, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        selected
          ? 'border-primary/60 bg-primary/90 text-on-primary hover:bg-primary'
          : 'border-line-strong bg-surface text-muted hover:border-primary/40 hover:text-fg',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="flex [&>svg]:size-4" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
