import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends ComponentProps<'div'> {
  /** Superfície elevada (cards dentro de seções). */
  elevated?: boolean;
  padded?: boolean;
}

export function Card({ elevated = false, padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line shadow-card',
        elevated ? 'bg-elevated' : 'bg-surface',
        padded && 'p-5 sm:p-6',
        className,
      )}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}

export function CardHeader({ title, description, action, className, as = 'h2' }: CardHeaderProps) {
  const Heading = as;
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className="font-display text-lg font-semibold text-fg">{title}</Heading>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
