import { expect, type Page, test } from '@playwright/test'

import { mock, openApp, submitSignIn, USERS } from './support/app.ts'

// Desktop shows "COMPRAR" / "Favoritar"; the mobile buy bar shows "Comprar NFT" / a heart
const buyButton = (page: Page) => page.getByRole('button', { name: /^Comprar/i })
// Rendered by both layouts; role queries skip the hidden one
const soldOutNotice = (page: Page) =>
  page.getByRole('status').filter({ hasText: 'Esta edição está esgotada. Escolha outra edição.' })
const favoriteButton = (page: Page) => page.getByRole('button', { name: /^Favoritar/ }).first()

// E2E #2: acesso direto ao detalhe e tratamento de recurso inexistente
test.describe('detalhe do NFT', () => {
  test('acesso direto mostra o NFT com título da página e edição na URL', async ({ page }) => {
    await openApp(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page).toHaveTitle('Emerald Ape #042 · Kurio')

    await page.getByRole('radio', { name: 'Aberta' }).click()
    await expect(page).toHaveURL(/edicao=emerald-ape-042-open/)
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Aberta' })).toBeChecked()
  })

  test('NFT inexistente mostra a página de não encontrado', async ({ page }) => {
    await openApp(page, '/nfts/nao-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'NFT não encontrado' })).toBeVisible()
    await expect(page).toHaveTitle('NFT não encontrado · Kurio')
    await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
    await expect(page.getByRole('list', { name: 'Resultados' })).toBeVisible()
  })

  test('edição esgotada não pode ser comprada', async ({ page }) => {
    await openApp(page, '/nfts/sage-nomad-009')
    await page.getByRole('radio', { name: '1/1 (esgotada)' }).click()
    await expect(soldOutNotice(page)).toBeVisible()
    await expect(buyButton(page)).toBeDisabled()
  })

  test('quantidade respeita o estoque da edição', async ({ page }) => {
    await openApp(page, '/nfts/neon-vessel-552')
    await expect(page.getByRole('radio', { name: '1/50' })).toBeChecked()
    const stepper = page.getByRole('group', { name: 'Quantidade de Neon Vessel #552' })
    await stepper.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(stepper.locator('output')).toHaveText('2')
    // Only 2 units of this edition exist
    await expect(stepper.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
    await expect(stepper).toHaveAccessibleDescription('Máximo disponível')
  })

  test('estoque esgotado via Socket.IO bloqueia a compra na hora', async ({ page }) => {
    await openApp(page, '/nfts/emerald-ape-042')
    await expect(buyButton(page)).toBeEnabled()
    await mock(page).updateEdition(
      { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50' },
      { available: 0 },
    )
    await expect(soldOutNotice(page)).toBeVisible()
    await expect(buyButton(page)).toBeDisabled()
  })

  test('comprar adiciona ao carrinho, abre o carrinho e o contador sobrevive ao refresh', async ({
    page,
    isMobile,
  }) => {
    await openApp(page, '/nfts/golden-beat-207')
    await buyButton(page).click()
    await expect(page).toHaveURL('/carrinho')
    const cartLink = isMobile
      ? page.getByRole('link', { name: 'Carrinho, 1 item' })
      : page.getByRole('link', { name: 'Carrinho com 1 item' })
    await expect(cartLink).toBeVisible()
    await page.reload()
    await expect(cartLink).toBeVisible()
  })
})

// E2E #4: favoritos, incluindo falha de mutation e recuperação do estado
test.describe('favoritos', () => {
  test('visitante entra para favoritar, o favorito persiste e a falha faz rollback', async ({
    page,
  }) => {
    await openApp(page, '/nfts/golden-signal-160')
    await favoriteButton(page).click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await submitSignIn(page, USERS.kai.email)
    await expect(page).toHaveURL('/nfts/golden-signal-160')

    await favoriteButton(page).click()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')

    await page.goto('/conta/favoritos')
    const list = page.getByRole('list', { name: 'Resultados' })
    await expect(list.getByRole('heading', { name: 'Golden Signal #160' })).toBeVisible()

    // The API fails: the heart flips back and the user is told
    await mock(page).setScenario('favorite-fails')
    const heart = list.getByRole('button', { name: 'Favoritar Golden Signal #160' })
    await heart.click()
    await expect(page.getByText('Não foi possível remover dos favoritos')).toBeVisible()
    await expect(heart).toHaveAttribute('aria-pressed', 'true')

    // Back to normal: removing works and the card leaves the list
    await mock(page).setScenario('instant')
    await heart.click()
    await expect(list).toBeHidden()
    await expect(
      page.getByText('Você ainda não favoritou nenhum NFT.', { exact: false }),
    ).toBeVisible()
  })
})
