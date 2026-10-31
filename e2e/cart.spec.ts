import { expect, type Page, test } from '@playwright/test'

import { mock, openApp, seedVisitorCart, submitSignIn, USERS } from './support/app.ts'

// Emerald 1/50 × 2 (2.38) + Violet aberta × 1 (1.39) + Ivory 1/10 × 2 (5.37) = 9.14 + taxa 0.016
const ITEMS: Parameters<typeof seedVisitorCart>[1] = [
  ['emerald-ape-042', 'emerald-ape-042-1of50', 2],
  ['violet-nomad-314', 'violet-nomad-314-open', 1],
  ['ivory-baron-088', 'ivory-baron-088-1of10', 2],
]

const lines = (page: Page) =>
  page.getByRole('list', { name: 'Itens do carrinho' }).getByRole('listitem')
const summary = (page: Page) => page.getByRole('region', { name: 'Resumo da carteira' })
const summaryValue = (page: Page, term: string) =>
  summary(page)
    .locator('div', { has: page.locator('dt', { hasText: new RegExp(`^${term}$`) }) })
    .locator('dd')

async function openCart(page: Page) {
  await openApp(page, '/')
  await seedVisitorCart(page, ITEMS)
  await page.goto('/carrinho')
  await expect(lines(page)).toHaveCount(3)
}

// E2E #5: carrinho, quantidades, remoção, cupom e persistência após refresh/login
test.describe('carrinho', () => {
  test('quantidade e remoção atualizam o resumo calculado pela API', async ({ page }) => {
    await openCart(page)
    await expect(summaryValue(page, 'Subtotal')).toHaveText('9.14 ETH')
    await expect(summaryValue(page, 'Total')).toHaveText('9.156 ETH')

    const emerald = lines(page).filter({ hasText: 'Emerald Ape #042' })
    await emerald.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(emerald.locator('output')).toHaveText('3')
    await expect(summaryValue(page, 'Total')).toHaveText('10.346 ETH')

    await page
      .getByRole('button', { name: 'Remover Violet Nomad #314 (Aberta) do carrinho' })
      .click()
    await expect(lines(page)).toHaveCount(2)
    await expect(summaryValue(page, 'Total')).toHaveText('8.956 ETH')
  })

  test('cupom inválido, expirado, válido e remoção', async ({ page }) => {
    await openCart(page)
    const field = summary(page).getByLabel('Código promocional')
    const apply = summary(page).getByRole('button', { name: 'Aplicar' })

    await field.fill('NOPE')
    await apply.click()
    await expect(field).toHaveAccessibleDescription('Código promocional inválido')
    await expect(field).toBeFocused()

    await field.fill('VERAO25')
    await apply.click()
    await expect(field).toHaveAccessibleDescription('Este código promocional expirou')

    await field.fill('genesis10')
    await apply.click()
    await expect(summary(page).getByText('Cupom GENESIS10 aplicado')).toBeVisible()
    await expect(summaryValue(page, 'Desconto do lançamento')).toHaveText('(-) 0.914 ETH')
    await expect(summaryValue(page, 'Total')).toHaveText('8.242 ETH')

    await summary(page).getByRole('button', { name: 'Remover cupom GENESIS10' }).click()
    await expect(summaryValue(page, 'Total')).toHaveText('9.156 ETH')
  })

  test('o carrinho do visitante sobrevive ao refresh e é mantido ao entrar', async ({
    page,
    isMobile,
  }) => {
    await openCart(page)
    await page.reload()
    await expect(lines(page)).toHaveCount(3)

    await page.goto('/carrinho?auth=entrar')
    await submitSignIn(page, USERS.kai.email)
    await expect(page).toHaveURL('/carrinho')
    await expect(lines(page)).toHaveCount(3)
    if (!isMobile)
      await expect(page.getByRole('link', { name: 'Carrinho com 5 itens' })).toBeVisible()

    // Now it is Kai's cart on the API: still there after a refresh
    await page.reload()
    await expect(lines(page)).toHaveCount(3)
  })

  test('preço e estoque alterados via Socket.IO são avisados e bloqueiam a finalização', async ({
    page,
  }) => {
    await openCart(page)
    await mock(page).updateEdition(
      { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50' },
      { price: '1.29' },
    )
    const notices = page.getByRole('list').filter({ hasText: 'O resumo já foi atualizado.' })
    await expect(notices).toContainText(
      'Emerald Ape #042 (1/50): o preço mudou de 1.19 ETH para 1.29 ETH.',
    )
    await expect(summaryValue(page, 'Total')).toHaveText('9.356 ETH')

    await mock(page).updateEdition(
      { nftId: 'ivory-baron-088', editionId: 'ivory-baron-088-1of10' },
      { available: 0 },
    )
    await expect(notices).toContainText(
      'Ivory Baron #088 (1/10) esgotou. Remova o item para finalizar.',
    )
    await expect(summary(page).getByRole('link', { name: 'Conectar e finalizar' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await page.getByRole('button', { name: 'Remover Ivory Baron #088 (1/10) do carrinho' }).click()
    await expect(
      summary(page).getByRole('link', { name: 'Conectar e finalizar' }),
    ).not.toHaveAttribute('aria-disabled', 'true')
  })
})
