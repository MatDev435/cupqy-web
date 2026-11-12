import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke tests NÃO destrutivos para homologação: leem o catálogo, autenticam usuários
 * controlados e chegam até a cotação de frete — sem criar pedidos nem pagar.
 */
const API = process.env.E2E_HML_API_URL ?? 'http://localhost:3333';
const customer = {
  email: process.env.E2E_CUSTOMER_EMAIL,
  password: process.env.E2E_CUSTOMER_PASSWORD,
};

async function login(page: Page, email: string, password: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('textbox', { name: 'Senha', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('API de homologação responde', async ({ request }) => {
  const response = await request.get(`${API}/health/ready`);
  expect(response.ok()).toBeTruthy();
});

test('catálogo carrega dados reais', async ({ page }) => {
  await page.goto('/cupcakes');
  await expect(page.getByText(/cupcakes? encontrados?/)).toBeVisible({ timeout: 30_000 });
});

test.describe('cliente controlado', () => {
  test.skip(
    !customer.email || !customer.password,
    'Defina E2E_CUSTOMER_EMAIL e E2E_CUSTOMER_PASSWORD.',
  );

  test('entra, vê o perfil e cota a retirada no checkout', async ({ page }) => {
    await login(page, customer.email!, customer.password!);
    await expect(page.getByRole('link', { name: 'Entrar' })).toHaveCount(0);
    await page.goto('/conta');
    await expect(page.getByRole('heading', { name: 'Meus dados' })).toBeVisible();

    await page.goto('/cupcakes');
    const add = page.getByRole('button', { name: /^Adicionar .* ao carrinho$/ }).first();
    test.skip((await add.count()) === 0, 'Sem cupcakes com estoque hoje em homologação.');
    await add.click();
    await page.goto('/checkout');
    await page.getByText('Retirada na loja', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ir para o pagamento' })).toBeEnabled({
      timeout: 30_000,
    });
  });
});

test.describe('papéis internos', () => {
  test('confeiteiro acessa a cozinha', async ({ page }) => {
    test.skip(!process.env.E2E_BAKER_EMAIL, 'Defina E2E_BAKER_EMAIL e E2E_BAKER_PASSWORD.');
    await login(page, process.env.E2E_BAKER_EMAIL!, process.env.E2E_BAKER_PASSWORD!);
    await expect(page).toHaveURL(/\/cozinha/);
    await expect(page.getByRole('heading', { name: 'Painel da cozinha' })).toBeVisible();
  });

  test('administrador acessa o dashboard', async ({ page }) => {
    test.skip(!process.env.E2E_ADMIN_EMAIL, 'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD.');
    await login(page, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
