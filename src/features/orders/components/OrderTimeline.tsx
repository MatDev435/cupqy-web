import { Check } from 'lucide-react';
import type { OrderProgressStep } from '@/api/types';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';

/** Linha do tempo do pedido (US11 CA#03), montada pela API conforme o tipo de entrega. */
export function OrderTimeline({ steps }: { steps: OrderProgressStep[] }) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:gap-2" aria-label="Progresso do pedido">
      {steps.map((step, index) => (
        <li
          key={step.status}
          aria-current={step.current ? 'step' : undefined}
          className="relative flex gap-3 pb-6 last:pb-0 sm:flex-1 sm:flex-col sm:items-center sm:pb-0 sm:text-center"
        >
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 sm:top-[15px] sm:left-[calc(50%+1.25rem)] sm:h-0.5 sm:w-[calc(100%-2.5rem)]',
                steps[index + 1]?.done ? 'bg-primary' : 'bg-line-strong',
              )}
            />
          )}
          <span
            className={cn(
              'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
              step.done && !step.current && 'border-primary bg-primary text-on-primary',
              step.current && 'border-primary bg-primary/15 text-primary ring-4 ring-primary/15',
              !step.done && 'border-line-strong bg-surface text-subtle',
            )}
          >
            {step.done && !step.current ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              index + 1
            )}
          </span>
          <span className="flex flex-col gap-0.5 pt-1 sm:pt-0">
            <span
              className={cn(
                'text-sm font-medium',
                step.current ? 'text-primary' : step.done ? 'text-fg' : 'text-subtle',
              )}
            >
              {step.label}
              <span className="sr-only">
                {step.current ? ' (etapa atual)' : step.done ? ' (concluída)' : ' (pendente)'}
              </span>
            </span>
            {step.reachedAt && (
              <span className="text-xs text-subtle">{formatTime(step.reachedAt)}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
