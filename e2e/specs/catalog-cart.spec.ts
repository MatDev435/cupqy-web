import { expect, test } from '../support/fixtures';

test.describe('Catálogo e carrinho', () => {
  test('busca, filtra, abre detalhes e monta o carrinho', async ({ page }) => {
    await page.goto('/cupcakes');
    await expect(page.getByText('3 cupcakes encontrados')).toBeVisible();
    // Esgotados não aparecem por padrão.
    await expect(page.getByRole('heading', { name: 'Limão Siciliano' })).toHaveCount(0);

    await page.getByRole('searchbox', { name: /Buscar cupcakes/ }).fill('vegano');
    await expect(page).toHaveURL(/busca=vegano/);
    await expect(page.getByText('1 cupcake encontrado')).toBeVisible();

    await page.getByRole('button', { name: 'Limpar tudo' }).click();
    const frutados = page
      .getByRole('complementary', { name: 'Filtros' })
      .getByRole('checkbox', { name: 'Frutados' });
    await frutados.click();
    await expect(frutados).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Morango Fresco' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chocolate Belga' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Morango Fresco' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Morango Fresco' })).toBeVisible();
    await expect(page.getByText('Últimas 3 unidades')).toBeVisible();
    const increase = page.getByRole('button', { name: 'Aumentar quantidade de Morango Fresco' });
    await increase.click();
    await increase.click();
    await expect(increase).toBeDisabled(); // limite do estoque do dia
    await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click();
    await expect(page.getByText('Adicionado ao carrinho')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Carrinho, 3 itens' })).toBeVisible();

    // Voltar preserva os filtros do catálogo.
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page).toHaveURL(/categoria=frutados/);

    await page.getByRole('link', { name: 'Carrinho, 3 itens' }).click();
    await expect(page.getByRole('heading', { name: 'Morango Fresco' })).toBeVisible();
    const summary = page.getByRole('complementary', { name: 'Resumo' });
    await expect(summary).toContainText('R$ 35,70');
    await page.getByRole('button', { name: 'Diminuir quantidade de Morango Fresco' }).click();
    await expect(summary).toContainText('R$ 23,80');
    await page.getByRole('button', { name: 'Remover Morango Fresco do carrinho' }).click();
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio.' })).toBeVisible();
  });

  test('carrinho persiste após recarregar a página', async ({ page }) => {
    await page.goto('/cupcakes');
    await page.getByRole('button', { name: 'Adicionar Chocolate Belga ao carrinho' }).click();
    await expect(page.getByRole('link', { name: 'Carrinho, 1 item' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: 'Carrinho, 1 item' })).toBeVisible();
  });

  test('navegação móvel abre o menu e leva ao catálogo @mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page
      .getByRole('dialog', { name: 'Menu' })
      .getByRole('link', { name: 'Cupcakes' })
      .click();
    await expect(page).toHaveURL('/cupcakes');
    await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0);
  });
});
