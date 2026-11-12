import type { ReactNode } from 'react';
import { LogoMark } from '@/components/brand/Logo';

interface AuthCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Moldura das telas de autenticação. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-radial-glow" aria-hidden="true" />
      <div className="relative container-page flex justify-center py-12 sm:py-20">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-line bg-surface/90 p-6 shadow-pop sm:p-9">
            <div className="mb-7 flex flex-col items-center gap-3 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12">
                <LogoMark className="size-7 text-primary" />
              </span>
              <h1 className="font-display text-3xl font-semibold text-fg">{title}</h1>
              {description && <p className="text-sm text-muted">{description}</p>}
            </div>
            {children}
          </div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
