import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin } from 'lucide-react';
import { queryKeys } from '@/api/queryKeys';
import { getStoreInfo } from '@/api/store';
import { Logo } from '@/components/brand/Logo';
import { formatDuration } from '@/lib/format';

const CURRENT_YEAR = new Date().getFullYear();

export function Footer() {
  const { data: store } = useQuery({
    queryKey: queryKeys.store,
    queryFn: ({ signal }) => getStoreInfo(signal),
    staleTime: 30 * 60_000,
  });

  return (
    <footer className="mt-16 border-t border-line bg-surface/40">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Logo size="md" tagline />
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Cupcakes artesanais feitos em pequenos lotes, com ingredientes selecionados e muito
            carinho em cada detalhe.
          </p>
        </div>

        <nav aria-label="Rodapé" className="flex flex-col gap-3 text-sm">
          <h2 className="font-display text-base font-semibold text-fg">Navegação</h2>
          <Link to="/cupcakes" className="text-muted hover:text-fg">
            Cupcakes
          </Link>
          <Link to="/categorias" className="text-muted hover:text-fg">
            Categorias
          </Link>
          <Link to="/pedidos" className="text-muted hover:text-fg">
            Meus pedidos
          </Link>
          <Link to="/conta" className="text-muted hover:text-fg">
            Minha conta
          </Link>
        </nav>

        <div className="flex flex-col gap-3 text-sm">
          <h2 className="font-display text-base font-semibold text-fg">A confeitaria</h2>
          {store ? (
            <>
              <p className="flex items-start gap-2 text-muted">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{store.address}</span>
              </p>
              <p className="flex items-start gap-2 text-muted">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Retirada em cerca de {formatDuration(store.pickup.estimatedMinutes)}</span>
              </p>
            </>
          ) : (
            <p className="text-muted">Entrega e retirada na loja.</p>
          )}
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-subtle">
          © {CURRENT_YEAR} Cupqy — Confeitaria artesanal. Pagamentos processados pelo Mercado Pago.
        </p>
      </div>
    </footer>
  );
}
