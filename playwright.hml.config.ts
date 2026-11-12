import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra o ambiente de HOMOLOGAÇÃO (não usar produção):
 *   - front-end local (npm run dev) com .env apontando para o Express local;
 *   - Express local ligado ao Supabase "cupqy-hml";
 *   - Mercado Pago em modo de testes (o pagamento hospedado não é automatizado).
 *
 * Variáveis necessárias (usuários controlados, criados para os testes):
 *   E2E_HML_BASE_URL (padrão http://localhost:5173)
 *   E2E_HML_API_URL  (padrão http://localhost:3333)
 *   E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD
 *   E2E_BAKER_EMAIL / E2E_BAKER_PASSWORD (opcional)
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (opcional)
 */
export default defineConfig({
  testDir: './e2e/hml',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-hml' }]],
  use: {
    baseURL: process.env.E2E_HML_BASE_URL ?? 'http://localhost:5173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
});
