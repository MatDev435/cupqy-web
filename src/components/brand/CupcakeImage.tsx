import { useState } from 'react';
import { cn } from '@/lib/cn';
import { LogoMark } from './Logo';

interface CupcakeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Imagens acima da dobra (ex.: hero/detalhes) não devem usar lazy loading. */
  priority?: boolean;
  sizes?: string;
}

/**
 * Foto do cupcake (URL pública do Supabase Storage) com lazy loading e um placeholder elegante
 * quando o produto ainda não tem foto ou a imagem falha.
 */
export function CupcakeImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  sizes,
}: CupcakeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-linear-to-br from-elevated via-surface to-canvas',
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setFailedSrc(src ?? null)}
          className={cn(
            'size-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      ) : (
        <div
          className="flex size-full items-center justify-center"
          // Placeholder decorativo quando alt="" (a informação já está no texto ao lado).
          {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
        >
          <div className="absolute inset-0 bg-radial-glow" aria-hidden="true" />
          <LogoMark className="relative size-1/3 max-h-24 max-w-24 text-primary/45" />
        </div>
      )}
    </div>
  );
}
