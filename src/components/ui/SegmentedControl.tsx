import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Contador opcional exibido ao lado do rótulo. */
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Grupo de opções exclusivas (ex.: Hoje/Semana/Mês). Usa rádios nativos: as setas do teclado
 * trocam a opção e leitores de tela anunciam "1 de 3, selecionado".
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset
      className={cn(
        'scrollbar-none inline-flex max-w-full overflow-x-auto rounded-xl border border-line-strong bg-surface p-1',
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const checked = option.value === value;
        return (
          <div key={option.value} className="relative">
            <input
              type="radio"
              id={id}
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-primary',
                size === 'sm' ? 'h-8 px-3 text-sm' : 'h-9 px-4 text-sm',
                checked ? 'bg-elevated text-fg shadow-card' : 'text-muted hover:text-fg',
              )}
            >
              {option.label}
              {option.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    checked ? 'bg-primary text-on-primary' : 'bg-elevated text-muted',
                  )}
                >
                  {option.count}
                </span>
              )}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
