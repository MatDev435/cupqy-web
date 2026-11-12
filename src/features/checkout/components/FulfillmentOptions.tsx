import { useId } from 'react';
import { Bike, Store } from 'lucide-react';
import type { FulfillmentType } from '@/api/types';
import { cn } from '@/lib/cn';

interface FulfillmentOptionsProps {
  value: FulfillmentType;
  onChange: (value: FulfillmentType) => void;
}

const OPTIONS = [
  {
    value: 'DELIVERY' as const,
    title: 'Delivery (Receber em casa)',
    description: 'Frete calculado pela distância até você.',
    icon: Bike,
  },
  {
    value: 'PICKUP' as const,
    title: 'Retirada na loja',
    description: 'Sem frete: busque quando estiver pronto.',
    icon: Store,
  },
];

/** Escolha entre entrega e retirada (US09 CA#01) com rádios nativos. */
export function FulfillmentOptions({ value, onChange }: FulfillmentOptionsProps) {
  const name = useId();
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Forma de recebimento</legend>
      {OPTIONS.map(({ value: option, title, description, icon: Icon }) => {
        const id = `${name}-${option}`;
        const checked = value === option;
        return (
          <div key={option} className="relative">
            <input
              type="radio"
              id={id}
              name={name}
              value={option}
              checked={checked}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className={cn(
                'flex h-full cursor-pointer gap-4 rounded-2xl border p-4 transition-colors',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                checked
                  ? 'border-primary/60 bg-primary/8'
                  : 'border-line-strong bg-surface hover:border-primary/30',
              )}
            >
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-xl',
                  checked ? 'bg-primary text-on-primary' : 'bg-elevated text-muted',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-fg">{title}</span>
                <span className="text-sm text-muted">{description}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1 ml-auto size-4 shrink-0 rounded-full border-2',
                  checked
                    ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_var(--color-surface)]'
                    : 'border-line-strong',
                )}
              />
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
