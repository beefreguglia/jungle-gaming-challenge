import { expect, type Page, type Request, test } from '@playwright/test'

import { mock, openApp, seedVisitorCart, submitSignIn, USERS } from './support/app.ts'

const EMERALD = { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50' }

const receiptHeading = (page: Page) =>
  page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })
const confirmButton = (page: Page) => page.getByRole('button', { name: 'Confirmar compra' })
const orderSummary = (page: Page) => page.getByRole('region', { name: 'Seus NFTs' })

/** Collects the idempotency key of every POST /orders the page sends. */
function trackOrderKeys(page: Page): string[] {
  const keys: string[] = []
  page.on('request', (request: Request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') {
      keys.push(request.headers()['idempotency-key'] ?? '')
    }
  })
  return keys
}

/** Visitor cart with 2 × Emerald Ape (1/50), then sign in as Nova through /checkout. */
async function openCheckout(page: Page, scenario = 'instant') {
  await openApp(page, '/', scenario)
  await seedVisitorCart(page, [[EMERALD.nftId, EMERALD.editionId, 2]])
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await submitSignIn(page, USERS.nova.email)
  await expect(page).toHaveURL('/checkout')
  // 2 × 1.19 + network fee 0.016
  await expect(orderSummary(page)).toContainText('2.396 ETH')
}

async function connectWallet(page: Page) {
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(
    page
      .getByRole('form', { name: 'Pagamento' })
      .getByRole('status')
      .filter({ hasText: 'MetaMask conectada' }),
  ).toBeVisible()
}

// E2E #6: compra completa, do catálogo ao recibo confirmado
test('compra completa do catálogo ao recibo, removendo os itens do carrinho', async ({ page }) => {
  await openApp(page, '/nfts/emerald-ape-042')
  await page.getByRole('button', { name: /^Comprar/i }).click()
  await expect(page).toHaveURL('/carrinho')
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  await submitSignIn(page, USERS.nova.email)
  await expect(page).toHaveURL('/checkout')

  // Nova's registered wallet fills the payment fields
  await expect(page.getByRole('radio', { name: /Principal · Cofre principal/ })).toBeChecked()
  await expect(page.getByLabel('Endereço da carteira')).toHaveValue(
    '0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8',
  )

  // Without a connection the order is not sent
  await confirmButton(page).click()
  await expect(page.getByText('Conecte a carteira para confirmar a compra.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeFocused()

  await connectWallet(page)
  await confirmButton(page).click()
  await expect(receiptHeading(page)).toBeVisible()
  await expect(page).toHaveURL(/\/pedidos\/order_\d+$/)
  const receipt = page.getByRole('article')
  await expect(receipt.getByRole('list', { name: 'NFTs comprados' })).toContainText(
    'Emerald Ape #042',
  )
  await expect(receipt).toContainText('1.206 ETH')
  await expect(receipt.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute(
    'href',
    /^https:\/\/etherscan\.io\/tx\/0x[0-9a-f]{64}$/,
  )

  // The receipt survives a reload; the bought item left the cart
  await page.reload()
  await expect(receiptHeading(page)).toBeVisible()
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

// E2E #7: falha de pagamento, clique repetido e timeout com recuperação do mesmo pedido
test.describe('falhas do pedido', () => {
  test('pagamento recusado mostra o motivo e preserva o carrinho', async ({ page }) => {
    await openCheckout(page, 'payment-refused')
    await connectWallet(page)
    await confirmButton(page).click()
    await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await expect(page.getByText('O pagamento foi recusado pela carteira')).toBeVisible()
    await expect(receiptHeading(page)).toHaveCount(0)

    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(
      page.getByRole('list', { name: 'Itens do carrinho' }).getByRole('listitem'),
    ).toHaveCount(1)
  })

  test('clique repetido envia uma única tentativa de compra', async ({ page }) => {
    await openCheckout(page)
    await connectWallet(page)
    const keys = trackOrderKeys(page)
    await confirmButton(page).dblclick()
    await expect(receiptHeading(page)).toBeVisible()
    expect(keys.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(1)
  })

  test('timeout recupera o mesmo pedido com a mesma chave', async ({ page }) => {
    test.setTimeout(45_000)
    await openCheckout(page, 'order-timeout')
    await connectWallet(page)
    const keys = trackOrderKeys(page)
    await confirmButton(page).click()
    await expect(page.getByText('A confirmação da compra está demorando')).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: 'Verificar compra' }).click()
    await expect(receiptHeading(page)).toBeVisible()
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
  })

  test('a carteira recusa a conexão; depois conecta e desconecta', async ({ page }) => {
    await openCheckout(page, 'wallet-rejected')
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page.getByText('A conexão foi recusada na carteira')).toBeVisible()

    await mock(page).setScenario('instant')
    await connectWallet(page)
    await page.getByRole('button', { name: 'Desconectar' }).click()
    await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
    await confirmButton(page).click()
    await expect(page.getByText('Conecte a carteira para confirmar a compra.')).toBeVisible()
  })
})

// E2E #9: alteração de preço/disponibilidade via Socket.IO durante o checkout
test.describe('mudanças em tempo real no checkout', () => {
  test('preço novo exige nova confirmação antes da compra', async ({ page }) => {
    await openCheckout(page)
    await connectWallet(page)
    await mock(page).updateEdition(EMERALD, { price: '1.29' })

    const notice = page.getByRole('alert').filter({ hasText: 'Os valores do pedido mudaram' })
    await expect(notice).toContainText('Emerald Ape #042: preço de 1.19 ETH para 1.29 ETH')
    await confirmButton(page).click()
    await expect(
      page.getByText('Os valores mudaram. Aceite os novos valores antes de confirmar.'),
    ).toBeVisible()
    await expect(receiptHeading(page)).toHaveCount(0)

    await notice.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(notice).toHaveCount(0)
    await confirmButton(page).click()
    await expect(receiptHeading(page)).toBeVisible()
    // 2 × 1.29 + 0.016
    await expect(page.getByRole('article')).toContainText('2.596 ETH')
  })

  test('item esgotado bloqueia a compra e leva ao carrinho', async ({ page }) => {
    await openCheckout(page)
    await mock(page).updateEdition(EMERALD, { available: 0 })
    const notice = page.getByRole('alert').filter({ hasText: 'A disponibilidade mudou' })
    await expect(notice).toContainText('Emerald Ape #042 (1/50): esgotado')
    await notice.getByRole('link', { name: 'Ajustar no carrinho' }).click()
    await expect(page).toHaveURL('/carrinho')
  })
})

// E2E #10: eventos duplicados/antigos, desconexão e retomada de pedido pendente
test.describe('retomada do pedido', () => {
  test('eventos duplicados e antigos não regridem o pedido confirmado', async ({ page }) => {
    await openCheckout(page, 'duplicate-events')
    await connectWallet(page)
    await confirmButton(page).click()
    await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toBeVisible()
    await expect(receiptHeading(page)).toBeVisible()
    // The stale "pending" copy that follows each event never takes the receipt away
    await page.waitForTimeout(500)
    await expect(receiptHeading(page)).toBeVisible()
  })

  test('sem socket e após recarregar, o pedido pendente é retomado sem nova compra', async ({
    page,
  }) => {
    await openCheckout(page, 'default')
    await connectWallet(page)
    const keys = trackOrderKeys(page)
    await confirmButton(page).click()
    await expect(page.getByRole('heading', { name: 'Processando pagamento' })).toBeVisible()
    await expect(page).toHaveURL(/\/checkout\?pedido=order_\d+$/)

    await mock(page).disconnectRealtime()
    await page.reload()
    await expect(receiptHeading(page)).toBeVisible({ timeout: 10_000 })
    expect(keys).toHaveLength(1)
  })

  test('recarregar com a compra sem resposta oferece verificar o mesmo pedido', async ({
    page,
  }) => {
    await openCheckout(page, 'order-timeout')
    await connectWallet(page)
    const keys = trackOrderKeys(page)
    await confirmButton(page).click()
    await expect(page.getByRole('button', { name: 'Confirmando compra…' })).toBeVisible()
    // MSW handlers run in the page: let the simulated latency pass so the API has created
    // the order (its answer is what stays 20 s late) before the reload cuts the request
    await page.waitForTimeout(1000)
    await page.reload()

    await expect(page.getByText('Você tinha uma compra em andamento')).toBeVisible()
    await page.getByRole('button', { name: 'Verificar compra' }).click()
    await expect(receiptHeading(page)).toBeVisible()
    expect(new Set(keys).size).toBe(1)
  })
})

// Expiração durante o checkout preserva o contexto; logout apaga os dados privados
test.describe('sessão no checkout', () => {
  test('a sessão expira no pagamento e o novo login volta com o que foi digitado', async ({
    page,
  }) => {
    await openCheckout(page)
    const note = page.getByLabel('Observação do colecionador (opcional)')
    await note.fill('Presente para a coleção da Kai')

    await mock(page).expireSessions()
    await page.getByRole('button', { name: 'Conectar carteira' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    await submitSignIn(page, USERS.nova.email)
    await expect(page).toHaveURL('/checkout')
    await expect(note).toHaveValue('Presente para a coleção da Kai')
  })

  test('o logout apaga o rascunho do pagamento', async ({ page }) => {
    await openCheckout(page)
    const note = page.getByLabel('Observação do colecionador (opcional)')
    await note.fill('Rascunho privado')

    await page.goto('/conta/perfil')
    await page.getByRole('button', { name: 'Sair' }).first().click()
    await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0)
    await page.goto('/checkout')
    await submitSignIn(page, USERS.nova.email)
    await expect(page).toHaveURL('/checkout')
    await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('')
  })
})

// Isolamento: nada do usuário anterior aparece para o próximo na mesma aba
test('o próximo usuário não vê pedido, favoritos nem carrinho do anterior', async ({ page }) => {
  await openCheckout(page)
  await connectWallet(page)
  await confirmButton(page).click()
  await expect(receiptHeading(page)).toBeVisible()
  const receiptUrl = new URL(page.url()).pathname

  // Nova's seeded favorites, and a new cart line after the purchase
  await page.goto('/conta/favoritos')
  await expect(
    page
      .getByRole('list', { name: 'Resultados' })
      .getByRole('heading', { name: 'Sage Nomad #009' }),
  ).toBeVisible()
  await page.goto('/nfts/sage-nomad-009')
  await page.getByRole('button', { name: /^Comprar/i }).click()
  await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toBeVisible()

  await page.goto('/conta/perfil')
  await page.getByRole('button', { name: 'Sair' }).first().click()
  await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0)
  await page.goto('/login')
  await submitSignIn(page, USERS.kai.email)
  await expect(page).toHaveURL('/')

  await page.goto(receiptUrl)
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
  await page.goto('/conta/favoritos')
  await expect(
    page.getByText('Você ainda não favoritou nenhum NFT.', { exact: false }),
  ).toBeVisible()
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})
