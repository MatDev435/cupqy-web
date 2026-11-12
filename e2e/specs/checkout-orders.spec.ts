import { expect, login, test } from '../support/fixtures';

test.describe('Checkout, pagamento e pedidos', () => {
  test('retirada: Checkout Pro simulado aprova e o pedido é confirmado pelo servidor', async ({
    page,
    backend,
  }) => {
    await page.goto('/cupcakes');
    await page.getByRole('button', { name: 'Adicionar Chocolate Belga ao carrinho' }).click();
    await page.getByRole('link', { name: 'Carrinho, 1 item' }).click();
    await page.getByRole('link', { name: 'Finalizar compra' }).click();

    // Checkout exige login e volta para ele depois.
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fcheckout/);
    await page.getByLabel('E-mail').fill('cliente@cupqy.test');
    await page.getByRole('textbox', { name: 'Senha', exact: true }).fill('cupcake2026');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/checkout');

    await page.getByText('Retirada na loja', { exact: true }).click();
    await expect(
      page.getByRole('main').getByText('Rua Augusta, 1500 - Consolação, São Paulo - SP'),
    ).toBeVisible();
    await page.getByLabel(/observação/).fill('Embalar para presente');
    await page.getByRole('button', { name: 'Ir para o pagamento' }).click();

    // Página hospedada do Mercado Pago (simulada).
    await expect(page.getByRole('heading', { name: /Mercado Pago/ })).toBeVisible();
    await page.getByRole('link', { name: 'Pagar com Pix (aprovado)' }).click();

    await expect(page.getByText('Pagamento confirmado!')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pedido #1001' })).toBeVisible();
    await expect(page).toHaveURL(/\/pedidos\/[^?]+$/); // parâmetros do MP removidos
    await expect(page.getByRole('list', { name: 'Progresso do pedido' })).toContainText(
      'Em preparo',
    );
    expect(backend.orders[0]).toMatchObject({
      status: 'IN_PREPARATION',
      notes: 'Embalar para presente',
    });

    // O carrinho foi esvaziado e o pedido aparece no histórico.
    await expect(page.getByRole('link', { name: 'Carrinho vazio' })).toBeVisible();
    await page.goto('/pedidos');
    await expect(page.getByText('Pedido #1001')).toBeVisible();
  });

  test('delivery com novo endereço (CEP) e pagamento recusado permite tentar de novo', async ({
    page,
  }) => {
    await login(page, 'cliente@cupqy.test');
    await expect(page).toHaveURL('/');
    await page.goto('/cupcakes');
    await page.getByRole('button', { name: 'Adicionar Chocolate Vegano ao carrinho' }).click();
    await page.goto('/checkout');

    await page.getByLabel('CEP').fill('01310100');
    await expect(page.getByLabel('Rua')).toHaveValue('Avenida Paulista');
    await page.getByLabel('Número').fill('1000');
    await page.getByRole('button', { name: 'Calcular frete' }).click();
    await expect(page.getByText('45 min')).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Resumo do pedido' })).toContainText(
      'R$ 20,20',
    );
    await page.getByRole('button', { name: 'Ir para o pagamento' }).click();

    await page.getByRole('link', { name: 'Pagamento recusado' }).click();
    await expect(page.getByText('Pagamento não aprovado')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tentar pagar novamente' })).toBeVisible();

    // Cancelamento pelo cliente enquanto aguarda pagamento.
    await page.getByRole('button', { name: 'Cancelar pedido' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar pedido' }).click();
    await expect(page.getByText('Cancelado por você.')).toBeVisible();
  });
});
