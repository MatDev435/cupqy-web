import { setupServer } from 'msw/node';

/** Servidor MSW compartilhado: cada teste registra os handlers de que precisa com server.use(). */
export const server = setupServer();

export const API = 'http://api.test/api/v1';
