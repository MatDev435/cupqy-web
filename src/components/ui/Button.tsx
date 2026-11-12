import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

const base =
  'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-out ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary:
    'border border-white/15 bg-linear-to-b from-primary-hi to-primary-lo text-on-primary shadow-glow ' +
    'hover:from-[#f8d4e0] hover:to-primary',
  secondary:
    'border border-line-strong bg-canvas/40 text-fg hover:border-primary/50 hover:bg-elevated',
  ghost: 'text-muted hover:bg-elevated hover:text-fg',
  subtle: 'bg-elevated text-fg hover:bg-overlay',
  danger: 'border border-danger/45 bg-danger/12 text-danger-fg hover:bg-danger/22',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-12 px-6 text-base',
  icon: 'size-11 p-0',
  'icon-sm': 'size-9 p-0',
};

/** Classes dos botões — reutilizadas por links com aparência de botão. */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: ButtonStyleOptions = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Exibe um indicador de carregamento e impede novos cliques. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** Link de navegação com a aparência de botão. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, fullWidth, className })} {...props}>
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
