import path from 'node:path';
import { expect, login, test } from '../support/fixtures';

test.describe('Painel da cozinha', () => {
  test('confeiteiro vê pedido pago e avança até retirado; o cliente acompanha', async ({
    page,
    backend,
    browser,
  }) => {
    // Pedido pago de retirada criado direto no back-end simulado.
    const customer = backend.accounts.find((account) => account.role === 'CUSTOMER')!;
    const cupcake = backend.cupcakeByName('Chocolate Belga');
    backend.orders.push({
      id: 'e2e-order-kitchen',
      orderNumber: 1500,
      userId: customer.id,
      status: 'AWAITING_PAYMENT',
      fulfillmentType: 'PICKUP',
      items: [
        {
          id: 'i1',
          cupcakeId: cupcake.id,
          name: cupcake.name,
          unitPriceCents: cupcake.priceCents,
          quantity: 2,
        },
      ],
      feeCents: 0,
      notes: 'Sem granulado',
      address: null,
      courierName: null,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      cancelledAt: null,
      completedAt: null,
      cancellationReason: null,
      payment: { status: 'APPROVED', approvedAt: new Date().toISOString() },
      history: [],
    });
    backend.setStatus(backend.orders[0]!, 'IN_PREPARATION');

    await login(page, 'confeiteiro@cupqy.test');
    await expect(page).toHaveURL('/cozinha');
    const card = page.getByRole('article', { name: '#1500' });
    await expect(card).toContainText('Sem granulado');
    await expect(card).toContainText('2×');
    await card.getByRole('button', { name: 'Pronto para retirada' }).click();
    await expect(page.getByText('Pedido #1500 atualizado')).toBeVisible();
    await card.getByRole('button', { name: 'Retirado pelo cliente' }).click();
    await expect(page.getByRole('heading', { name: 'Nenhum pedido na fila' })).toBeVisible();

    // Cliente, em outra sessão, vê o pedido concluído.
    const customerContext = await browser.newContext();
    await backend.install(customerContext);
    const customerPage = await customerContext.newPage();
    await login(customerPage, 'cliente@cupqy.test');
    await expect(customerPage).toHaveURL('/');
    await customerPage.goto('/pedidos/e2e-order-kitchen');
    await expect(customerPage.getByRole('heading', { name: 'Pedido #1500' })).toBeVisible();
    await expect(customerPage.getByText('Concluído').first()).toBeVisible();
    await customerContext.close();
  });
});

test.describe('Administração', () => {
  test('admin cadastra cupcake, envia foto e define estoque', async ({ page, backend }) => {
    await login(page, 'admin@cupqy.test');
    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Administração' })
      .getByRole('link', { name: 'Cupcakes' })
      .click();
    await page.getByRole('link', { name: 'Adicionar cupcake' }).click();
    await page.getByRole('textbox', { name: 'Nome', exact: true }).fill('Pistache Siciliano');
    await page.getByLabel('Sabor').fill('Pistache');
    await page.getByLabel('Descrição').fill('Creme de pistache.');
    await page.getByLabel('Ingredientes').fill('Farinha, pistache, manteiga.');
    await page.getByLabel('Preço (R$)').fill('14,50');
    await page.getByLabel('Categoria').selectOption({ label: 'Clássicos' });
    await page.getByRole('button', { name: 'Cadastrar cupcake' }).click();

    await expect(page.getByText('Cupcake cadastrado!')).toBeVisible();
    const created = backend.cupcakeByName('Pistache Siciliano');
    expect(created.priceCents).toBe(1450);

    // Upload direto ao Storage via URL assinada.
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(import.meta.dirname, '../support/cupcake.png'));
    await expect(page.getByText('Pré-visualização')).toBeVisible();
    await page.getByRole('button', { name: 'Enviar foto' }).click();
    await expect(page.getByText('Foto atualizada!')).toBeVisible();
    expect(created.imagePath).toMatch(/^cupcakes\//);

    // Estoque do dia.
    await page
      .getByRole('navigation', { name: 'Administração' })
      .getByRole('link', { name: 'Estoque' })
      .click();
    await page.getByRole('spinbutton', { name: /Pistache Siciliano/ }).fill('12');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByText('Estoque atualizado.')).toBeVisible();
    expect(created.stock).toBe(12);

    // Já aparece no catálogo público.
    await page.goto('/cupcakes?busca=pistache');
    await expect(page.getByRole('heading', { name: 'Pistache Siciliano' })).toBeVisible();
  });
});
