import { useId, type ComponentProps, type ReactNode } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

/* -------------------------------------------------------------------------- */
/* Controles básicos                                                          */
/* -------------------------------------------------------------------------- */

const controlBase =
  'w-full rounded-xl border border-line-strong bg-surface text-fg placeholder:text-subtle ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ' +
  'hover:border-[rgb(245_238_233/0.24)] ' +
  'focus:border-primary/70 focus:outline-none focus:ring-3 focus:ring-primary/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-invalid:border-danger/70 aria-invalid:focus:ring-danger/20';

export interface InputProps extends ComponentProps<'input'> {
  /** Ícone decorativo à esquerda (ex.: lupa). */
  leftIcon?: ReactNode;
  /** Conteúdo interativo à direita (ex.: botão de mostrar senha). */
  rightSlot?: ReactNode;
  inputClassName?: string;
}

export function Input({ leftIcon, rightSlot, className, inputClassName, ...props }: InputProps) {
  return (
    <div className={cn('relative flex items-center', className)}>
      {leftIcon && (
        <span
          className="pointer-events-none absolute left-3.5 flex text-subtle [&>svg]:size-[18px]"
          aria-hidden="true"
        >
          {leftIcon}
        </span>
      )}
      <input
        className={cn(
          controlBase,
          'h-11 px-3.5 text-[0.95rem]',
          leftIcon && 'pl-10',
          rightSlot && 'pr-11',
          inputClassName,
        )}
        {...props}
      />
      {rightSlot && <span className="absolute right-1.5 flex">{rightSlot}</span>}
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        controlBase,
        'min-h-24 px-3.5 py-2.5 text-[0.95rem] leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <select
        className={cn(
          controlBase,
          'h-11 cursor-pointer appearance-none pr-10 pl-3.5 text-[0.95rem]',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 size-[18px] text-muted"
        aria-hidden="true"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Estrutura de campo: rótulo, dica e erro associados ao controle              */
/* -------------------------------------------------------------------------- */

export interface FieldA11yProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
  'aria-required'?: true;
}

interface FieldProps {
  label: ReactNode;
  /** Texto de apoio exibido abaixo do campo. */
  hint?: ReactNode;
  /** Mensagem de erro — associada ao controle por aria-describedby. */
  error?: string;
  required?: boolean;
  /** Exibe "(opcional)" ao lado do rótulo. */
  optional?: boolean;
  className?: string;
  id?: string;
  /** Recebe as props de acessibilidade que devem ser aplicadas ao controle. */
  children: (a11y: FieldA11yProps) => ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required,
  optional,
  className,
  id: idProp,
  children,
}: FieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="ml-0.5 text-primary" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="ml-1.5 text-xs font-normal text-subtle">(opcional)</span>}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger-fg">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

type FieldWrapperProps = Omit<FieldProps, 'children' | 'id'> & { id?: string };

export function TextField({
  label,
  hint,
  error,
  required,
  optional,
  className,
  id,
  ...inputProps
}: FieldWrapperProps & InputProps) {
  return (
    <Field {...{ label, hint, error, required, optional, className, id }}>
      {(a11y) => <Input {...inputProps} {...a11y} />}
    </Field>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  required,
  optional,
  className,
  id,
  ...props
}: FieldWrapperProps & ComponentProps<'textarea'>) {
  return (
    <Field {...{ label, hint, error, required, optional, className, id }}>
      {(a11y) => <Textarea {...props} {...a11y} />}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  optional,
  className,
  id,
  children,
  ...props
}: FieldWrapperProps & ComponentProps<'select'>) {
  return (
    <Field {...{ label, hint, error, required, optional, className, id }}>
      {(a11y) => (
        <Select {...props} {...a11y}>
          {children}
        </Select>
      )}
    </Field>
  );
}

/* -------------------------------------------------------------------------- */
/* Caixa de seleção e interruptor                                             */
/* -------------------------------------------------------------------------- */

interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, className, id: idProp, ...props }: CheckboxProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={descriptionId}
        className="mt-0.5 size-[18px] shrink-0 cursor-pointer rounded border-line-strong accent-primary"
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm text-fg">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-subtle">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

interface SwitchProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

/** Interruptor acessível (checkbox nativo com role="switch"). */
export function Switch({ label, description, className, id: idProp, ...props }: SwitchProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const descriptionId = description ? `${id}-description` : undefined;
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-fg">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-xs text-subtle">
            {description}
          </p>
        )}
      </div>
      <span className="relative inline-flex shrink-0">
        <input
          // O estado é nativo do checkbox: aria-checked não deve ser usado em input[type=checkbox].
          // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props
          role="switch"
          id={id}
          type="checkbox"
          aria-describedby={descriptionId}
          className="peer h-6 w-11 cursor-pointer appearance-none rounded-full border border-line-strong bg-elevated transition-colors checked:border-primary/60 checked:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-muted transition-transform peer-checked:translate-x-5 peer-checked:bg-on-primary"
        />
      </span>
    </div>
  );
}
