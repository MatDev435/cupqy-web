import { useEffect } from 'react';

/** Define o título da aba (também anunciado na troca de página para leitores de tela). */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Cupqy` : 'Cupqy — Confeitaria artesanal';
  }, [title]);
}
