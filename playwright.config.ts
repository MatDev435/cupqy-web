import { defineConfig, devices } from '@playwright/test';

/**
 * E2E da CI: a aplicação é compilada com URLs fictícias e TODAS as chamadas externas (API,
 * Supabase Auth/Storage e Checkout Pro) são atendidas pelo back-end simulado em
 * e2e/support/fakeBackend.ts — rápido, determinístico e sem serviços externos.
 */
const PORT = 4174;

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_API_BASE_URL: 'http://api.e2e.test',
      VITE_SUPABASE_URL: 'http://supabase.e2e.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e_key_000000000000',
    },
  },
});
