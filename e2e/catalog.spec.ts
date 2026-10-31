import { expect, type Page, test } from '@playwright/test'

import { mock, openApp } from './support/app.ts'

const catalog = (page: Page) => page.getByRole('region', { name: 'Catálogo de NFTs' })
const filters = (page: Page) => page.getByRole('complementary', { name: 'Filtros do catálogo' })
const status = (page: Page) => catalog(page).locator('[aria-live="polite"]')
const results = (page: Page) => catalog(page).getByRole('list', { name: 'Resultados' })
const cardNames = (page: Page) => results(page).getByRole('heading').allTextContents()

/** Total the API reports for a query string: the UI must agree with it. */
function apiTotal(page: Page, query: string): Promise<number> {
  return page.evaluate(async (q) => {
    const response = await fetch(`/api/nfts?${q}`)
    return ((await response.json()) as { total: number }).total
  }, query)
}

/** Names on the API's first page for a query string. */
function apiNames(page: Page, query: string): Promise<string[]> {
  return page.evaluate(async (q) => {
    const response = await fetch(`/api/nfts?${q}`)
    return ((await response.json()) as { items: { name: string }[] }).items.map((nft) => nft.name)
  }, query)
}

// Same wording as the live region ("1 NFT encontrado", "8 NFTs encontrados")
function statusText(total: number, page = 1): string {
  return `${total} ${total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}, página ${page}`
}

async function cardPrices(page: Page): Promise<number[]> {
  const texts = await results(page).getByRole('article').locator('p').allTextContents()
  return texts.map((text) => Number.parseFloat(text))
}

// E2E #1: busca, filtros combinados, ordenação, paginação e restauração pelo histórico
test.describe('catálogo', () => {
  test('filtros combinados, ordenação e paginação vivem na URL e no histórico', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'A sidebar de filtros é do desktop; o mobile usa o painel (teste abaixo)')
    await openApp(page, '/')
    await expect(status(page)).toHaveText(statusText(await apiTotal(page, '')))

    await catalog(page).getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(catalog(page).getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const pageTwo = await cardNames(page)

    // Two collections (either) and one network (and); any filter change goes back to page 1
    for (const name of [/^Música/, /^Arte digital/, /^Polygon/]) {
      await filters(page).getByRole('button', { name }).click()
    }
    await expect(page).not.toHaveURL(/page=/)
    const combined = await apiTotal(
      page,
      'collections=music&collections=digital-art&networks=polygon',
    )
    expect(combined).toBeGreaterThan(1)
    await expect(status(page)).toHaveText(statusText(combined))
    await expect(filters(page).getByRole('button', { name: /^Música/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await page.getByRole('combobox', { name: 'Ordenar por:' }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect
      .poll(() => cardPrices(page))
      .toEqual((await cardPrices(page)).toSorted((a, b) => a - b))

    // Refresh keeps everything
    await page.reload()
    await expect(filters(page).getByRole('button', { name: /^Polygon/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('combobox', { name: 'Ordenar por:' })).toHaveText('Menor preço')

    // Back walks through the steps (sort, 3 filters) until page 2 without filters
    for (let step = 0; step < 4; step += 1) await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(filters(page).getByRole('button', { name: /^Música/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await expect.poll(() => cardNames(page)).toEqual(pageTwo)
  })

  test('busca pelo cabeçalho ou pela barra mobile, com resultado vazio e limpeza', async ({
    page,
    isMobile,
  }) => {
    await openApp(page, '/')
    if (isMobile) {
      await page.getByRole('searchbox', { name: 'Explorar coleções' }).fill('golden')
    } else {
      await page.getByRole('button', { name: 'Buscar NFTs' }).click()
      await page.getByRole('searchbox', { name: /Buscar NFTs/ }).fill('golden')
      await page.keyboard.press('Enter')
    }
    await expect(page).toHaveURL(/q=golden/)
    // The API searches name, series, creator and token id; the grid shows exactly its answer
    await expect(status(page)).toHaveText(statusText(await apiTotal(page, 'q=golden')))
    await expect.poll(() => cardNames(page)).toEqual(await apiNames(page, 'q=golden'))

    await page.goto('/?q=zzzz')
    const empty = catalog(page).getByText('Nenhum NFT encontrado', { exact: true }).locator('..')
    await expect(empty).toBeVisible()
    await empty.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page).not.toHaveURL(/q=/)
    await expect(status(page)).toHaveText(/NFTs encontrados, página 1/)
  })

  test('painel de filtros no mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Painel de filtros do mobile')
    await openApp(page, '/')
    await page.getByRole('button', { name: 'Filtros', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await sheet.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/collections=.*music/)
    await sheet.getByRole('button', { name: 'Ver resultados' }).click()
    await expect(sheet).toBeHidden()
    await expect(page.getByRole('button', { name: 'Filtros (ativos)' })).toBeVisible()
    await expect(status(page)).toHaveText(statusText(await apiTotal(page, 'collections=music')))
  })

  test('respostas fora de ordem não sobrescrevem a busca atual', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mesma lógica de dados no mobile; o cenário usa a sidebar')
    await openApp(page, '/', 'out-of-order')
    await expect(status(page)).toHaveText(/NFTs encontrados/)
    await filters(page)
      .getByRole('button', { name: /^Música/ })
      .click()
    await expect(status(page)).toHaveText(statusText(await apiTotal(page, 'collections=music')))

    // The next request is the slow one; a newer, fast request overtakes it
    await filters(page)
      .getByRole('button', { name: /^Fotografia/ })
      .click()
    await filters(page)
      .getByRole('button', { name: /^Música/ })
      .click()
    const latest = await apiTotal(page, 'collections=photography')
    await page.waitForTimeout(2_000)
    await expect(page).toHaveURL(/collections=.*photography/)
    await expect(status(page)).toHaveText(statusText(latest))
  })

  test('preço alterado via Socket.IO aparece no card sem recarregar', async ({ page }) => {
    await openApp(page, '/')
    const card = catalog(page).getByRole('article').filter({ hasText: 'Emerald Ape #042' })
    await expect(card).toContainText('1.19 ETH')
    await mock(page).updateEdition(
      { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50' },
      { price: '1.05' },
    )
    await expect(card).toContainText('1.05 ETH')
  })
})

// E2E #12: skeletons durante carregamento lento, feedback de falha e recuperação
test.describe('catálogo: carregamento e falhas', () => {
  test('skeleton no carregamento lento, sem deslocar o layout', async ({ page }) => {
    // Runs in the page before any script: sums unexpected layout shifts (CLS)
    await page.addInitScript({
      content: `
        window.__shifts = []
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__shifts.push(entry.value)
          }
        }).observe({ type: 'layout-shift', buffered: true })
      `,
    })
    await openApp(page, '/', 'slow')
    await expect(catalog(page)).toHaveAttribute('aria-busy', 'true')
    await expect(catalog(page).locator('ul[aria-hidden="true"]')).toBeVisible()
    await expect(catalog(page).getByRole('article').first()).toBeVisible({ timeout: 10_000 })
    const cls = await page.evaluate(() =>
      ((globalThis as { __shifts?: number[] }).__shifts ?? []).reduce(
        (total, value) => total + value,
        0,
      ),
    )
    expect(cls).toBeLessThan(0.1)
  })

  test('falha do servidor mostra erro e recupera ao tentar de novo', async ({ page }) => {
    await openApp(page, '/', 'server-error')
    const alert = catalog(page).getByRole('alert')
    // Transient failures are retried twice with backoff before the error shows
    await expect(alert).toContainText('Não foi possível carregar os NFTs', { timeout: 15_000 })
    await mock(page).setScenario('instant')
    await alert.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(catalog(page).getByRole('article').first()).toBeVisible()
    await expect(alert).toBeHidden()
  })

  test('falhas transitórias são repetidas sem incomodar o usuário', async ({ page }) => {
    await openApp(page, '/', 'flaky')
    await expect(catalog(page).getByRole('article').first()).toBeVisible({ timeout: 15_000 })
    await expect(catalog(page).getByRole('alert')).toHaveCount(0)
  })
})

test.describe('início: destaques e navegação', () => {
  const highlight = (page: Page, index: number) =>
    page.getByRole('button', { name: `Destaque ${index} de 3` })

  test('os destaques avançam sozinhos', async ({ page }) => {
    await openApp(page, '/')
    await expect(highlight(page, 1)).toHaveAttribute('aria-current', 'true')
    await expect(highlight(page, 2)).toHaveAttribute('aria-current', 'true', { timeout: 10_000 })
  })

  test('o header marca "Mercado" enquanto o catálogo está sob ele', async ({ page, isMobile }) => {
    test.skip(isMobile, 'No mobile a navegação é a barra inferior, sem "Mercado"')
    await openApp(page, '/')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    const market = nav.getByRole('link', { name: 'Mercado' })
    await expect(market).not.toHaveAttribute('aria-current')

    await market.click()
    await expect(page.getByRole('banner')).toBeInViewport()
    await expect(market).toHaveAttribute('aria-current', 'page')

    await page.evaluate('scrollTo(0, 0)')
    await expect(market).not.toHaveAttribute('aria-current')
  })
})
