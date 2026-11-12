import { expect, login, test } from '../support/fixtures';

test.describe('Autenticação (Supabase Auth)', () => {
  test('cadastro de cliente entra automaticamente e mostra boas-vindas', async ({
    page,
    backend,
  }) => {
    await page.goto('/cadastro');
    await page.getByLabel('Nome completo').fill('Paula Nova');
    await page.getByLabel('E-mail').fill('paula@cupqy.test');
    await page.getByLabel('Telefone').fill('11987654321');
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('docinho2026');
    await page.getByLabel('Confirmação de senha').fill('docinho2026');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Boas-vindas, Paula!')).toBeVisible();
    expect(backend.accounts.find((account) => account.email === 'paula@cupqy.test')).toMatchObject({
      role: 'CUSTOMER',
      phone: '11987654321',
    });
  });

  test('login inválido exibe mensagem genérica; válido entra; logout pede confirmação', async ({
    page,
  }) => {
    await login(page, 'cliente@cupqy.test', 'senhaErrada1');
    await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos.');

    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('cupcake2026');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /Clara/ })).toBeVisible();

    await page.getByRole('button', { name: /Clara/ }).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    const dialog = page.getByRole('dialog', { name: 'Sair da conta?' });
    await dialog.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();

    // Depois do logout, áreas restritas levam ao login.
    await page.goto('/pedidos');
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpedidos/);
  });

  test('recuperação de senha mostra confirmação sem revelar a conta', async ({ page }) => {
    await page.goto('/esqueci-senha');
    await page.getByLabel('E-mail').fill('qualquer@cupqy.test');
    await page.getByRole('button', { name: 'Enviar link de recuperação' }).click();
    await expect(page.getByRole('heading', { name: 'Verifique seu e-mail' })).toBeVisible();
  });

  test('cliente não acessa a administração nem a cozinha', async ({ page }) => {
    await login(page, 'cliente@cupqy.test');
    await expect(page).toHaveURL('/');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
    await page.goto('/cozinha');
    await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
  });
});
