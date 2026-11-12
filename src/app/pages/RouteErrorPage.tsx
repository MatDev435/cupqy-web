import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { buttonStyles } from '@/components/ui';

/** Fallback para erros inesperados de renderização ou carregamento de rotas. */
export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (!notFound) console.error(error);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo size="md" />
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold">
          {notFound ? 'Página não encontrada' : 'Algo saiu do forno errado'}
        </h1>
        <p className="text-muted">
          {notFound
            ? 'O endereço pode ter mudado ou a página não existe mais.'
            : 'Ocorreu um erro inesperado. Recarregue a página ou volte ao início.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className={buttonStyles({ variant: 'secondary' })}
          onClick={() => window.location.reload()}
        >
          Recarregar
        </button>
        <Link to="/" className={buttonStyles()}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
