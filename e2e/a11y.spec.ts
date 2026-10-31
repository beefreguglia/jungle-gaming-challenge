import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

import { openApp, seedVisitorCart, signInAt, USERS } from './support/app.ts'

const EMERALD: [string, string, number] = ['emerald-ape-042', 'emerald-ape-042-1of50', 2]

/** WCAG 2.1 A/AA rules from axe-core; the report lists rule, target and reason. */
async function expectNoViolations(page: Page, context: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const report = violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')}`),
  )
  expect(report, `${context}\n${report.join('\n')}`).toEqual([])
}

/** Tabs until `target` has focus, failing after `limit` presses. */
async function tabTo(page: Page, target: ReturnType<Page['getByRole']>, limit = 60) {
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === element.ownerDocument.activeElement)) return
  }
  throw new Error('Element never received focus by keyboard')
}

// E2E #11: navegação por teclado, foco de diálogos e validação de formulários
test.describe('acessibilidade automática (axe, WCAG 2.1 AA)', () => {
  test('páginas públicas', async ({ page }) => {
    test.setTimeout(90_000)
    await openApp(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('region', { name: /catálogo/i }).first()).toBeVisible()
    await expectNoViolations(page, 'início')

    await page.goto('/nfts/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await expectNoViolations(page, 'detalhe')

    await seedVisitorCart(page, [EMERALD])
    await page.goto('/carrinho')
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Resumo da carteira' })).toContainText('Total')
    await expectNoViolations(page, 'carrinho')

    for (const path of ['/login', '/cadastro', '/nfts/nao-existe']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectNoViolations(page, path)
    }
  })

  test('páginas privadas, do pagamento ao recibo', async ({ page }) => {
    test.setTimeout(90_000)
    await openApp(page, '/')
    await seedVisitorCart(page, [EMERALD])
    await page.goto('/checkout')
    await page.getByRole('form', { name: 'Entrar' }).getByLabel('E-mail').fill(USERS.nova.email)
    await page
      .getByRole('form', { name: 'Entrar' })
      .getByLabel('Senha', { exact: true })
      .fill('kurio1234')
    await page.getByRole('form', { name: 'Entrar' }).getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByRole('region', { name: 'Seus NFTs' })).toContainText('2.396 ETH')
    await expectNoViolations(page, 'pagamento')

    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(
      page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
    ).toBeVisible()
    await expectNoViolations(page, 'recibo')

    for (const path of ['/conta/perfil', '/conta/carteiras', '/conta/favoritos']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
      await expectNoViolations(page, path)
    }
  })
})

test.describe('teclado e foco', () => {
  test('o link de atalho leva o foco ao conteúdo', async ({ page }) => {
    await openApp(page, '/carrinho')
    await expect(page.locator('main')).toBeVisible()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('main')).toBeFocused()
  })

  test('ampliar a arte abre um diálogo que prende o foco e o devolve no Esc', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'A ampliação faz parte da galeria desktop')
    await openApp(page, '/nfts/emerald-ape-042')
    const trigger = page.getByRole('button', { name: 'Ampliar imagem' })
    await tabTo(page, trigger)
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Emerald Ape #042' })
    await expect(dialog).toBeVisible()
    await expectNoViolations(page, 'diálogo de ampliação')
    for (let step = 0; step < 5; step += 1) {
      await page.keyboard.press('Tab')
      await expect(dialog.locator(':focus')).toHaveCount(1)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('o painel de filtros do mobile prende o foco e o devolve no Esc', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'O painel de filtros é a versão mobile da barra lateral')
    await openApp(page, '/')
    const trigger = page.getByRole('button', { name: 'Filtros' })
    await trigger.focus()
    await page.keyboard.press('Enter')

    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    await expectNoViolations(page, 'painel de filtros')
    for (let step = 0; step < 15; step += 1) {
      await page.keyboard.press('Tab')
      await expect(sheet.locator(':focus')).toHaveCount(1)
    }
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('o pagamento funciona só com o teclado', async ({ page }) => {
    await openApp(page, '/')
    await seedVisitorCart(page, [EMERALD])
    await signInAt(page, '/checkout', USERS.nova.email)
    await expect(page.getByRole('region', { name: 'Seus NFTs' })).toContainText('2.396 ETH')

    // Radio groups move with the arrow keys: MetaMask → WalletConnect
    const metamask = page.getByRole('radio', { name: 'MetaMask' })
    await tabTo(page, metamask)
    // Held like a real key press: Radix checks the item only while the arrow is still down
    await page.keyboard.press('ArrowDown', { delay: 100 })
    await expect(page.getByRole('radio', { name: 'WalletConnect' })).toBeChecked()

    const connect = page.getByRole('button', { name: 'Conectar carteira' })
    await tabTo(page, connect)
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('status').filter({ hasText: 'WalletConnect conectada' }),
    ).toBeVisible()

    await tabTo(page, page.getByRole('button', { name: 'Confirmar compra' }))
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
    ).toBeVisible()
  })
})

test.describe('validação', () => {
  test('o pagamento aponta os campos inválidos e foca o primeiro', async ({ page }) => {
    await openApp(page, '/')
    await seedVisitorCart(page, [EMERALD])
    await signInAt(page, '/checkout', USERS.nova.email)
    const form = page.getByRole('form', { name: 'Pagamento' })
    await expect(page.getByRole('region', { name: 'Seus NFTs' })).toContainText('2.396 ETH')

    await form.getByRole('radio', { name: /Usar outra carteira/ }).check()
    await form.getByLabel('Nome de usuário').fill('')
    await form.getByRole('button', { name: 'Confirmar compra' }).click()

    const username = form.getByLabel('Nome de usuário')
    await expect(username).toBeFocused()
    await expect(username).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByLabel('Endereço da carteira')).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByRole('radiogroup', { name: 'Carteira e rede' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    // An EVM address does not pass on Solana; the message comes with the field
    await form.getByRole('combobox', { name: 'Rede' }).click()
    await page.getByRole('option', { name: 'Solana' }).click()
    await form.getByLabel('Endereço da carteira').fill('0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8')
    await form.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(form.getByLabel('Endereço da carteira')).toHaveAccessibleDescription(
      'Endereço Solana inválido',
    )
  })
})
