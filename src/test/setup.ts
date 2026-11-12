import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { configureAuth } from '@/api/http';
import { server } from './msw/server';

// Componentes carregados sob demanda (ex.: gráfico) podem demorar sob carga na CI.
configure({ asyncUtilTimeout: 4000 });

// O Supabase Realtime nunca conecta nos testes de componentes (as telas usam o polling).
vi.mock('@/hooks/useRealtimeInvalidation', () => ({
  useRealtimeInvalidation: () => ({ connected: false }),
}));

// O jsdom não implementa todos os métodos do <dialog> nativo.
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype;
  if (!proto.showModal) {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  }
  if (!proto.close) {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}

// matchMedia e scrollTo não existem no jsdom.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
window.scrollTo = (() => {}) as typeof window.scrollTo;
URL.createObjectURL ??= () => 'blob:preview';
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
URL.revokeObjectURL ??= () => {};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

// Requisições autenticadas usam um token fixo (as telas recebem o contexto de auth simulado).
beforeEach(() => {
  configureAuth({
    getAccessToken: async () => 'test-access-token',
    refreshAccessToken: async () => null,
    onUnauthorized: () => {},
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterAll(() => server.close());
