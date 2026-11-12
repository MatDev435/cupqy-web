import { Leaf } from 'lucide-react';
import type { DietaryTag } from '@/api/types';
import { Badge } from '@/components/ui';

export function DietaryTagBadges({
  tags,
  size = 'sm',
}: {
  tags: DietaryTag[];
  size?: 'sm' | 'md';
}) {
  if (!tags.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Características alimentares">
      {tags.map((tag) => (
        <li key={tag.id}>
          <Badge tone="secondary" size={size} icon={<Leaf />}>
            {tag.name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
