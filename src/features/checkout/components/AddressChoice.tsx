import { useId } from 'react';
import { Plus } from 'lucide-react';
import type { Address } from '@/api/types';
import { AddressSummary } from '@/features/account/components/AddressSummary';
import { cn } from '@/lib/cn';

interface AddressChoiceProps {
  addresses: Address[];
  value: string;
  onChange: (value: string) => void;
}

export const NEW_ADDRESS = 'new';

/** Endereços salvos + opção de informar um novo (rádios nativos). */
export function AddressChoice({ addresses, value, onChange }: AddressChoiceProps) {
  const name = useId();
  const options = [
    ...addresses.map((address) => ({ id: address.id, address })),
    { id: NEW_ADDRESS, address: null },
  ];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium text-fg">Endereço de entrega</legend>
      {options.map(({ id, address }) => {
        const inputId = `${name}-${id}`;
        const checked = value === id;
        return (
          <div key={id} className="relative">
            <input
              type="radio"
              id={inputId}
              name={name}
              checked={checked}
              onChange={() => onChange(id)}
              className="peer sr-only"
            />
            <label
              htmlFor={inputId}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary',
                checked
                  ? 'border-primary/60 bg-primary/8'
                  : 'border-line-strong hover:border-primary/30',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 size-4 shrink-0 rounded-full border-2',
                  checked
                    ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_var(--color-surface)]'
                    : 'border-line-strong',
                )}
              />
              {address ? (
                <span className="flex flex-col gap-1">
                  <span className="font-medium text-fg">
                    {address.label || 'Endereço salvo'}
                    {address.isDefault && <span className="ml-2 text-xs text-primary">padrão</span>}
                  </span>
                  <AddressSummary address={address} />
                </span>
              ) : (
                <span className="flex items-center gap-2 font-medium text-fg">
                  <Plus className="size-4 text-primary" aria-hidden="true" /> Usar outro endereço
                </span>
              )}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
