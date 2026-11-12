import { SearchX } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada');
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<SearchX />}
        title="Página não encontrada"
        description="O endereço pode ter mudado ou a página não existe mais."
        action={<ButtonLink to="/">Voltar ao início</ButtonLink>}
      />
    </div>
  );
}
