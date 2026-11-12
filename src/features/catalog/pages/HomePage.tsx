import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function HomePage() {
  useDocumentTitle(null);
  return (
    <section className="container-page py-24">
      <h1 className="font-display text-5xl font-semibold text-balance">
        Cupcakes artesanais para momentos especiais
      </h1>
      <ButtonLink to="/cupcakes" className="mt-8" rightIcon={<ArrowRight className="size-4" />}>
        Ver cupcakes
      </ButtonLink>
    </section>
  );
}
