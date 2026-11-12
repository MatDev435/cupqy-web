import { test as base, expect, type Page } from '@playwright/test';
import { FakeBackend } from './fakeBackend';

export const PASSWORD = 'cupcake2026';

export const test = base.extend<{ backend: FakeBackend }>({
  // Automática: toda página do teste conversa só com o back-end simulado.
  backend: [
    async ({ context }, use) => {
      const backend = new FakeBackend();
      await backend.install(context);
      // O Realtime não conecta na CI: as telas usam o polling de segurança.
      await context.routeWebSocket(/realtime/, () => {});
      await use(backend);
    },
    { auto: true },
  ],
});

export { expect };

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('textbox', { name: 'Senha', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}
