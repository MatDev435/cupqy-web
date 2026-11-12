import { CircleCheck, CircleSlash, Hourglass } from 'lucide-react';
import type { Stock } from '@/api/types';
import { Badge } from '@/components/ui';
import { stockLabel, stockLevel } from '../stock';

export function StockBadge({
  stock,
  showAvailable = false,
}: {
  stock: Stock;
  showAvailable?: boolean;
}) {
  const level = stockLevel(stock);
  if (level === 'available' && !showAvailable) return null;
  const tone = level === 'sold-out' ? 'danger' : level === 'low' ? 'warning' : 'success';
  const icon =
    level === 'sold-out' ? <CircleSlash /> : level === 'low' ? <Hourglass /> : <CircleCheck />;
  return (
    <Badge tone={tone} icon={icon}>
      {stockLabel(stock)}
    </Badge>
  );
}
