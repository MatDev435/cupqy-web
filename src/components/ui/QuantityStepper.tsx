import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Nome do item, usado nos rótulos acessíveis ("Diminuir quantidade de …"). */
  itemLabel?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

/** Resposta tátil leve, quando o aparelho suporta (US07 — RNF#01). */
function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(8);
    } catch {
      // Ignorado: alguns navegadores bloqueiam a vibração sem interação prévia.
    }
  }
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  itemLabel,
  size = 'md',
  disabled = false,
  className,
}: QuantityStepperProps) {
  const suffix = itemLabel ? ` de ${itemLabel}` : '';
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;

  const change = (next: number) => {
    haptic();
    onChange(Math.min(max, Math.max(min, next)));
  };

  const buttonClass = cn(
    'inline-flex items-center justify-center rounded-lg text-fg transition-colors hover:bg-elevated',
    'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
    'disabled:pointer-events-none disabled:opacity-35',
    size === 'sm' ? 'size-8' : 'size-10',
  );

  return (
    <div
      role="group"
      aria-label={`Quantidade${suffix}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-line-strong bg-surface p-1',
        className,
      )}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => change(value - 1)}
        disabled={!canDecrease}
        aria-label={`Diminuir quantidade${suffix}`}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output
        aria-live="polite"
        aria-label={`Quantidade${suffix}`}
        className={cn(
          'min-w-8 text-center font-medium tabular-nums',
          size === 'sm' ? 'text-sm' : 'text-base',
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={buttonClass}
        onClick={() => change(value + 1)}
        disabled={!canIncrease}
        aria-label={`Aumentar quantidade${suffix}`}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
