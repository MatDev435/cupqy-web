import type { Category, DietaryTag } from '@/api/types';
import { Button, Checkbox, Skeleton, Switch } from '@/components/ui';
import { countActiveFilters, toggle, type CatalogFilters } from '../catalogParams';

interface CatalogFilterPanelProps {
  filters: CatalogFilters;
  onChange: (patch: Partial<CatalogFilters>) => void;
  onClear: () => void;
  categories: Category[] | undefined;
  flavors: string[] | undefined;
  dietaryTags: DietaryTag[] | undefined;
  idPrefix: string;
}

function OptionsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

/** Filtros por categoria, sabor e características alimentares (US06 CA#04/CA#05). */
export function CatalogFilterPanel({
  filters,
  onChange,
  onClear,
  categories,
  flavors,
  dietaryTags,
  idPrefix,
}: CatalogFilterPanelProps) {
  const active = countActiveFilters(filters);

  return (
    <div className="flex flex-col gap-7">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-fg">Categorias</legend>
        {categories ? (
          categories.map((category) => (
            <Checkbox
              key={category.id}
              id={`${idPrefix}-cat-${category.slug}`}
              label={category.name}
              checked={filters.categories.includes(category.slug)}
              onChange={() => onChange({ categories: toggle(filters.categories, category.slug) })}
            />
          ))
        ) : (
          <OptionsSkeleton />
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-fg">Sabores</legend>
        {flavors ? (
          flavors.map((flavor) => (
            <Checkbox
              key={flavor}
              id={`${idPrefix}-flavor-${flavor}`}
              label={flavor}
              checked={filters.flavors.includes(flavor)}
              onChange={() => onChange({ flavors: toggle(filters.flavors, flavor) })}
            />
          ))
        ) : (
          <OptionsSkeleton />
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-semibold text-fg">Restrições alimentares</legend>
        <p className="mb-2 text-xs text-subtle">O cupcake precisa atender a todas as marcadas.</p>
        {dietaryTags ? (
          dietaryTags.map((tag) => (
            <Checkbox
              key={tag.id}
              id={`${idPrefix}-tag-${tag.slug}`}
              label={tag.name}
              checked={filters.dietaryTags.includes(tag.slug)}
              onChange={() => onChange({ dietaryTags: toggle(filters.dietaryTags, tag.slug) })}
            />
          ))
        ) : (
          <OptionsSkeleton />
        )}
      </fieldset>

      <Switch
        id={`${idPrefix}-soldout`}
        label="Mostrar esgotados"
        description="Inclui cupcakes sem estoque hoje."
        checked={filters.includeSoldOut}
        onChange={(event) => onChange({ includeSoldOut: event.target.checked })}
      />

      <Button variant="secondary" size="sm" onClick={onClear} disabled={active === 0}>
        Limpar filtros{active > 0 ? ` (${active})` : ''}
      </Button>
    </div>
  );
}
