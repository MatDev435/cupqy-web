import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Cabeçalho padrão das páginas (h1 único por página). */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && (
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-semibold text-fg sm:text-4xl">{title}</h1>
        {description && <p className="max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
