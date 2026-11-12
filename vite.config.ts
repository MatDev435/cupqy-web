import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const testEnv = {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  css: false,
  restoreMocks: true,
  env: {
    VITE_API_BASE_URL: 'http://api.test',
    VITE_SUPABASE_URL: 'http://supabase.test',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_0000',
  },
};

// https://vite.dev/config/ — https://vitest.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          ...testEnv,
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.int.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          ...testEnv,
          name: 'integration',
          include: ['src/**/*.int.test.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/api/generated/**', 'src/main.tsx'],
      reporter: ['text-summary', 'html'],
    },
  },
});
