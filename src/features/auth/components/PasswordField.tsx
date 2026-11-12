import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextField } from '@/components/ui';

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'rightSlot'>;

/** Campo de senha com botão para mostrar/ocultar o texto. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-fg"
        >
          {visible ? (
            <EyeOff className="size-[18px]" aria-hidden="true" />
          ) : (
            <Eye className="size-[18px]" aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}
