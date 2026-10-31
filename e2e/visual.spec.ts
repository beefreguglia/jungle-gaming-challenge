import { expect, type Page, test } from '@playwright/test'

import { openApp, seedVisitorCart, signInAt, USERS } from './support/app.ts'

// Regressão visual: início, detalhe, carrinho e pagamento, desktop e mobile.
// Baselines live in e2e/__screenshots__/<project>/ (update: pnpm test:e2e:update). The
// scenario switcher, toasts and the fixed tab bar are hidden by e2e/support/screenshot.css

async function settle(page: Page) {
  // Sections that load last (related carousels) change the page height
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  // Lazy art (carousels, below the fold) is loaded at once; every visible image must be in
  const images = page.locator('img')
  await images.evaluateAll((list) => {
    for (const image of list) image.setAttribute('loading', 'eager')
  })
  // decode() resolves once the pixels are ready (hidden or broken images are skipped)
  await images.evaluateAll((list) =>
    Promise.all(
      list.map((image) =>
        (image as unknown as { decode(): Promise<void> }).decode().catch(() => undefined),
      ),
    ),
  )
}

async function snap(page: Page, name: string) {
  await settle(page)
  await expect(page).toHaveScreenshot(name, { fullPage: true })
}

test.describe('regressão visual', () => {
  test('início', async ({ page }) => {
    await openApp(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('#catalogo').getByRole('listitem').first()).toBeAttached()
    await snap(page, 'inicio.png')
  })

  test('detalhe', async ({ page }) => {
    await openApp(page, '/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await snap(page, 'detalhe.png')
  })

  test('carrinho', async ({ page }) => {
    await openApp(page, '/')
    await seedVisitorCart(page, [
      ['emerald-ape-042', 'emerald-ape-042-1of50', 2],
      ['violet-nomad-314', 'violet-nomad-314-open', 1],
      ['ivory-baron-088', 'ivory-baron-088-1of10', 2],
    ])
    await page.goto('/carrinho')
    await expect(page.getByRole('region', { name: 'Resumo da carteira' })).toContainText(
      '9.156 ETH',
    )
    await snap(page, 'carrinho.png')
  })

  test('pagamento', async ({ page }) => {
    await openApp(page, '/')
    await seedVisitorCart(page, [
      ['emerald-ape-042', 'emerald-ape-042-1of50', 2],
      ['violet-nomad-314', 'violet-nomad-314-open', 1],
    ])
    await signInAt(page, '/checkout', USERS.nova.email)
    await expect(page.getByRole('region', { name: 'Seus NFTs' })).toContainText('3.786 ETH')
    await snap(page, 'pagamento.png')
  })
})
