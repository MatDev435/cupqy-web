import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  label?: string;
}

/** Calcula as páginas visíveis com reticências: 1 … 4 5 6 … 10 */
export function getPageItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push('ellipsis');
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);
  return items;
}

const itemBase =
  'inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40';

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  label = 'Paginação',
}: PaginationProps) {
  if (totalPages <= 1) return null;
  const items = getPageItems(page, totalPages);

  return (
    <nav aria-label={label} className={cn('flex items-center justify-center gap-1.5', className)}>
      <button
        type="button"
        className={cn(itemBase, 'text-muted hover:bg-elevated hover:text-fg')}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <ul className="flex items-center gap-1.5">
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <li key={`ellipsis-${index}`} className="px-1 text-subtle" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={cn(
                  itemBase,
                  item === page
                    ? 'bg-primary text-on-primary'
                    : 'text-muted hover:bg-elevated hover:text-fg',
                )}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        className={cn(itemBase, 'text-muted hover:bg-elevated hover:text-fg')}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
