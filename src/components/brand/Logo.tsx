import { cn } from '@/lib/cn';

/** Símbolo da marca: cupcake em traço contínuo com um coração no topo (brand board). */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M16 6.2c-1.2-1.5-3.5-1.2-3.9.5-.3 1.3.8 2.5 3.9 4.4 3.1-1.9 4.2-3.1 3.9-4.4-.4-1.7-2.7-2-3.9-.5z" />
      <path d="M8 19c-1.8-.3-2.6-2.5-1.3-3.8.5-.5 1.1-.7 1.8-.7.2-2.3 2.4-3.8 4.6-3.1 1-.9 2.4-1.3 2.9-1.3s1.9.4 2.9 1.3c2.2-.7 4.4.8 4.6 3.1.7 0 1.3.2 1.8.7 1.3 1.3.5 3.5-1.3 3.8z" />
      <path d="M8.6 19l1.7 8h11.4l1.7-8M13.2 19l.5 8M18.8 19l-.5 8" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Exibe "CONFEITARIA ARTESANAL" abaixo do nome. */
  tagline?: boolean;
}

const sizes = {
  sm: { mark: 'size-7', text: 'text-2xl' },
  md: { mark: 'size-8', text: 'text-[1.75rem]' },
  lg: { mark: 'size-16', text: 'text-6xl' },
};

/** Logotipo Cupqy (símbolo + nome em Playfair Display com gradiente rosé). */
export function Logo({ className, size = 'md', tagline = false }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={cn('shrink-0 text-primary', sizes[size].mark)} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-brand-gradient font-display font-semibold tracking-tight',
            sizes[size].text,
          )}
        >
          Cupqy
        </span>
        {tagline && (
          <span className="mt-1.5 text-[0.6rem] font-medium tracking-[0.32em] text-muted uppercase">
            Confeitaria artesanal
          </span>
        )}
      </span>
    </span>
  );
}
