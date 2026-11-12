import { Outlet } from 'react-router';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

/** Layout da loja: cabeçalho, conteúdo principal e rodapé. */
export function StoreLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only z-[70] rounded-lg bg-primary px-4 py-2 font-medium text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
