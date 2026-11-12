import { Link } from 'react-router';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { getErrorMessage } from '@/api/errors';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCategories, useDietaryTags } from '../hooks';

/** Categorias e características alimentares, como atalhos para o catálogo filtrado (US06). */
export function CategoriesPage() {
  useDocumentTitle('Categorias');
  const categories = useCategories();
  const tags = useDietaryTags();

  return (
    <div className="container-page py-10 sm:py-14">
      <PageHeader
        eyebrow="Explore"
        title="Categorias"
        description="Encontre rapidamente o cupcake ideal para o seu momento."
      />

      <section aria-label="Categorias" className="mt-10">
        {categories.isError ? (
          <ErrorState
            message={getErrorMessage(categories.error)}
            onRetry={() => void categories.refetch()}
          />
        ) : categories.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : categories.data.length === 0 ? (
          <EmptyState icon={<LayoutGrid />} title="Nenhuma categoria cadastrada ainda" />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.data.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/cupcakes?categoria=${category.slug}`}
                  className="group flex h-full min-h-40 flex-col justify-end gap-2 rounded-2xl border border-line bg-linear-to-br from-elevated to-surface p-6 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <span className="flex items-center justify-between gap-2 font-display text-2xl font-semibold text-fg">
                    {category.name}
                    <ArrowRight
                      className="size-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </span>
                  {category.description && (
                    <span className="text-sm text-muted">{category.description}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tags.data && tags.data.length > 0 && (
        <section aria-labelledby="tags-title" className="mt-14">
          <h2 id="tags-title" className="font-display text-2xl font-semibold">
            Características alimentares
          </h2>
          <p className="mt-1 text-sm text-muted">Opções para dietas e restrições.</p>
          <ul className="mt-5 flex flex-wrap gap-3">
            {tags.data.map((tag) => (
              <li key={tag.id}>
                <Link
                  to={`/cupcakes?restricoes=${tag.slug}`}
                  className="inline-flex h-10 items-center rounded-full border border-secondary/35 bg-secondary/10 px-4 text-sm font-medium text-secondary-fg transition-colors hover:bg-secondary/20"
                >
                  {tag.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
