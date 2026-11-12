import type { ReactNode } from 'react';

export interface MeterItem {
  key: string;
  label: ReactNode;
  value: number;
  /** Texto exibido para o valor (ex.: "R$ 120,00 · 60%"). */
  display: string;
}

/**
 * Lista de medidores: nome, barra e valor por linha, barras alinhadas e com um único tom.
 * Partes de um todo comparadas sem depender de cor para identificar cada parte.
 */
export function MeterList({ items, label }: { items: MeterItem[]; label: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="flex flex-col gap-4" aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-fg">{item.label}</span>
            <span className="shrink-0 text-muted tabular-nums">{item.display}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-elevated" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${item.value > 0 ? Math.max(2, (item.value / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
