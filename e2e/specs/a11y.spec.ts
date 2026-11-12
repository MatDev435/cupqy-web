import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, login, test } from '../support/fixtures';

/** Auditoria automática (WCAG 2.1 A/AA) com axe-core nas principais telas. */
async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
  }));
  expect(summary).toEqual([]);
}

test.describe('Acessibilidade', () => {
  test('loja: home, catálogo, detalhes e carrinho', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Destaques de hoje' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chocolate Belga' })).toBeVisible();
    await audit(page);

    await page.goto('/cupcakes');
    await expect(page.getByText('3 cupcakes encontrados')).toBeVisible();
    await audit(page);

    await page.getByRole('link', { name: 'Chocolate Belga' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Chocolate Belga' })).toBeVisible();
    await audit(page);

    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    await page.goto('/carrinho');
    await expect(page.getByRole('link', { name: 'Finalizar compra' })).toBeVisible();
    await audit(page);
  });

  test('autenticação e checkout', async ({ page }) => {
    await page.goto('/entrar');
    await audit(page);
    await page.goto('/cadastro');
    await audit(page);

    await login(page, 'cliente@cupqy.test');
    await expect(page).toHaveURL('/');
    await page.goto('/cupcakes');
    await page.getByRole('button', { name: 'Adicionar Chocolate Belga ao carrinho' }).click();
    await page.goto('/checkout');
    await expect(page.getByLabel('CEP')).toBeVisible();
    await audit(page);
  });

  test('cozinha e administração', async ({ page }) => {
    await login(page, 'admin@cupqy.test');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await audit(page);
    await page.goto('/cozinha');
    await expect(page.getByRole('heading', { name: 'Painel da cozinha' })).toBeVisible();
    await audit(page);
    await page.goto('/admin/estoque');
    await expect(page.getByRole('table')).toBeVisible();
    await audit(page);
    await page.goto('/admin/cupcakes/novo');
    await expect(page.getByRole('heading', { name: 'Novo cupcake' })).toBeVisible();
    await audit(page);
  });
});
