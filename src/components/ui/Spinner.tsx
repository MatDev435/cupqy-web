import { cn } from '@/lib/cn';

interface SpinnerProps {
  className?: string;
  /** Texto para leitores de tela. Omita quando o contexto já anuncia o carregamento. */
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <svg className="size-[1.1em] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

/** Indicador de carregamento de seção/página, anunciado por leitores de tela. */
export function LoadingState({
  label = 'Carregando…',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-muted', className)}
    >
      <Spinner className="text-2xl text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
