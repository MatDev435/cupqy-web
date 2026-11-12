import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Dashboard } from '@/api/types';
import { formatDateOnly, formatMoney, plural } from '@/lib/format';

const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const shortDate = (date: string) => formatDateOnly(date).slice(0, 5); // "12/11"

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Dashboard['daily'][number] }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-line-strong bg-elevated px-3 py-2 shadow-pop">
      <p className="text-base font-semibold text-fg">{formatMoney(point.revenueCents)}</p>
      <p className="text-xs text-muted">
        {formatDateOnly(point.date)} · {plural(point.completedOrders, 'pedido', 'pedidos')}
      </p>
    </div>
  );
}

/**
 * Faturamento por dia (pedidos concluídos): colunas de um único tom, eixo único, grade
 * discreta, tooltip por coluna e tabela equivalente para quem não usa o gráfico.
 */
export function RevenueChart({ daily }: { daily: Dashboard['daily'] }) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="h-64"
        role="img"
        aria-label="Gráfico de faturamento por dia. Os valores estão na tabela abaixo."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daily} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgb(245 238 233 / 0.08)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: '#8f8a98', fontSize: 12 }}
              axisLine={{ stroke: 'rgb(245 238 233 / 0.16)' }}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              tickFormatter={(value: number) => compactCurrency.format(value / 100)}
              tick={{ fill: '#8f8a98', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={72}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(245 238 233 / 0.04)' }} />
            <Bar dataKey="revenueCents" fill="#e9a6bd" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted hover:text-fg">Ver dados em tabela</summary>
        <table className="mt-3 w-full">
          <caption className="sr-only">Faturamento por dia</caption>
          <thead>
            <tr className="border-b border-line text-left text-subtle">
              <th scope="col" className="py-2 font-medium">
                Dia
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Pedidos concluídos
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Faturamento
              </th>
            </tr>
          </thead>
          <tbody>
            {daily.map((point) => (
              <tr key={point.date} className="border-b border-line last:border-0">
                <th scope="row" className="py-1.5 text-left font-normal text-muted">
                  {formatDateOnly(point.date)}
                </th>
                <td className="py-1.5 text-right tabular-nums">{point.completedOrders}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatMoney(point.revenueCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
