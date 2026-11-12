import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

/** Anuncia a nova página para leitores de tela após cada navegação (SPA não recarrega). */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [message, setMessage] = useState('');
  const lastPath = useRef(pathname);

  useEffect(() => {
    // A primeira página é anunciada pelo próprio carregamento do documento.
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    // Aguarda as páginas atualizarem o document.title.
    const timer = window.setTimeout(() => setMessage(document.title), 150);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}
