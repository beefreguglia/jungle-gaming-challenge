import { cartLineStatus, cartLineTotal } from '@/domain/cart'
import { API_ERROR_CODES } from '@/domain/errors'
import { sumEth, type Eth } from '@/domain/money'
import { type NftNetwork, findEdition } from '@/domain/nft'
import { type CreateOrderInput, type Order, orderRequestFingerprint } from '@/domain/order'
import { couponDiscount, diffQuotes, isQuoteExpired, type Quote, quoteTotal } from '@/domain/quote'
import type { WalletConnection, WalletConnectionInput } from '@/domain/wallet'

import type { Backend } from '../backend'
import type { CartRecord, OrderRecord } from '../db/database'
import type { UserRecord } from '../fixtures/users'
import { fail } from '../lib/errors'
import { assertCouponUsable, removePurchased, toCartView } from './cart'
import { findNftRecord, updateEdition } from './catalog'

const QUOTE_TTL_MS = 5 * 60 * 1000

export const NETWORK_FEES: Record<NftNetwork, Eth> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}

const EXPLORERS: Record<NftNetwork, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

// --- Quote ----------------------------------------------------------------------------------

function assertPurchasable(lines: ReturnType<typeof toCartView>['lines']): void {
  if (lines.length === 0) throw fail.conflict(API_ERROR_CODES.cartEmpty, 'Seu carrinho está vazio')
  const blocked = lines.find((line) => cartLineStatus(line) !== 'ok')
  if (blocked) {
    throw fail.conflict(
      API_ERROR_CODES.editionUnavailable,
      `${blocked.name} (${blocked.editionName}) não tem estoque para a quantidade escolhida`,
    )
  }
}

/** Prices the cart as it is right now. Pure read: nothing is stored. */
export function priceCart(backend: Backend, cart: CartRecord, network: NftNetwork): Quote {
  const { lines } = toCartView(backend, cart)
  assertPurchasable(lines)

  const coupon = cart.couponCode ? assertCouponUsable(backend, cart.couponCode) : null
  const quoteLines = lines.map((line) => ({
    lineId: line.id,
    nftId: line.nftId,
    editionId: line.editionId,
    name: line.name,
    tokenId: line.tokenId,
    image: line.image,
    editionName: line.editionName,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    total: cartLineTotal(line),
    nftVersion: line.nftVersion,
  }))
  const subtotal = sumEth(quoteLines.map((line) => line.total))
  const discount = coupon ? couponDiscount(coupon, subtotal) : '0'
  const networkFee = NETWORK_FEES[network]
  const now = backend.now()

  return {
    id: '',
    lines: quoteLines,
    subtotal,
    discount,
    coupon: coupon && { code: coupon.code, description: coupon.description },
    network,
    networkFee,
    total: quoteTotal({ subtotal, discount, networkFee }),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
  }
}

// Scenario disruption fires once per activation, not on every new quote
let disruptionArmed = true

export function rearmCheckoutDisruption(): void {
  disruptionArmed = true
}

function scheduleDisruption(backend: Backend, quote: Quote): void {
  const { checkoutDisruption, checkoutDisruptionDelayMs } = backend.scenario()
  const [line] = quote.lines
  if (checkoutDisruption === 'none' || !line || !disruptionArmed) return
  disruptionArmed = false

  setTimeout(() => {
    const target = { nftId: line.nftId, editionId: line.editionId }
    const edition = findEdition(findNftRecord(backend, line.nftId), line.editionId)
    if (!edition) return
    if (checkoutDisruption === 'sold-out') updateEdition(backend, target, { available: 0 })
    else updateEdition(backend, target, { price: sumEth([edition.price, '0.1']) })
  }, checkoutDisruptionDelayMs)
}

export function createQuote(
  backend: Backend,
  context: { cart: CartRecord; user: UserRecord | null; network: NftNetwork },
): Quote {
  const quote = {
    ...priceCart(backend, context.cart, context.network),
    id: backend.db.nextId('quote'),
  }
  backend.db.state.quotes.push({ quote, cartId: context.cart.id, userId: context.user?.id ?? null })
  backend.db.commit()
  scheduleDisruption(backend, quote)
  return quote
}

// --- Wallet connection ----------------------------------------------------------------------

export function connectWallet(
  backend: Backend,
  user: UserRecord,
  input: WalletConnectionInput,
): WalletConnection {
  if (backend.scenario().walletRejects) {
    throw fail.forbidden(API_ERROR_CODES.walletRejected, 'A conexão foi recusada na carteira')
  }
  const connection = {
    ...input,
    id: backend.db.nextId('conn'),
    connectedAt: backend.now().toISOString(),
  }
  backend.db.state.connections.push({ ...connection, userId: user.id })
  backend.db.commit()
  return connection
}

export function disconnectWallet(backend: Backend, user: UserRecord, id: string): void {
  const { state } = backend.db
  state.connections = state.connections.filter(
    (item) => !(item.id === id && item.userId === user.id),
  )
  backend.db.commit()
}

// --- Orders ---------------------------------------------------------------------------------

function randomHash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function findOrderRecord(backend: Backend, user: UserRecord, id: string): OrderRecord {
  // Another user's order is reported as missing, never as forbidden: ids reveal nothing
  const record = backend.db.state.orders.find(
    (item) => item.order.id === id && item.userId === user.id,
  )
  if (!record) throw fail.notFound('Pedido não encontrado')
  return record
}

function finish(backend: Backend, record: OrderRecord, change: Partial<Order>): void {
  Object.assign(record.order, change, {
    version: record.order.version + 1,
    updatedAt: backend.now().toISOString(),
  })
  backend.db.commit()
  backend.realtime.publishOrder(record)
}

function settle(backend: Backend, record: OrderRecord): void {
  const { order } = record
  const editions = order.lines.map((line) => ({
    line,
    edition: findEdition(findNftRecord(backend, line.nftId), line.editionId),
  }))
  const soldOut = editions.find(({ line, edition }) => (edition?.available ?? 0) < line.quantity)

  if (record.outcome === 'refused' || soldOut) {
    finish(backend, record, {
      status: 'refused',
      refusalReason: soldOut
        ? `${soldOut.line.name} esgotou antes da confirmação. Nenhum valor foi cobrado.`
        : 'O pagamento foi recusado pela carteira. Nenhum valor foi cobrado.',
    })
    return
  }

  for (const { line, edition } of editions) {
    const target = { nftId: line.nftId, editionId: line.editionId }
    updateEdition(backend, target, { available: (edition?.available ?? 0) - line.quantity })
  }
  removePurchased(backend, record.cartId, order.lines)
  const hash = randomHash()
  finish(backend, record, {
    status: 'confirmed',
    transaction: { hash, explorerUrl: `${EXPLORERS[order.network]}${hash}` },
  })
}

/** Settles every pending order whose payment time has come (timers, reads, page reloads). */
export function settleDueOrders(backend: Backend): void {
  const now = backend.now().getTime()
  for (const record of backend.db.state.orders) {
    if (record.order.status === 'pending' && new Date(record.settleAt).getTime() <= now) {
      settle(backend, record)
    }
  }
}

export function scheduleSettlement(backend: Backend, record: OrderRecord): void {
  const wait = Math.max(0, new Date(record.settleAt).getTime() - backend.now().getTime())
  setTimeout(() => settleDueOrders(backend), wait + 10)
}

function assertQuoteCurrent(backend: Backend, quote: Quote, cart: CartRecord): void {
  if (isQuoteExpired(quote, backend.now())) {
    throw fail.conflict(API_ERROR_CODES.quoteExpired, 'A cotação expirou. Revise os valores')
  }
  const current = priceCart(backend, cart, quote.network)
  if (diffQuotes(quote, current).length > 0 || current.coupon?.code !== quote.coupon?.code) {
    throw fail.conflict(
      API_ERROR_CODES.quoteOutdated,
      'Preço, disponibilidade ou desconto mudaram. Revise e confirme novamente',
    )
  }
}

function resolveOrderInputs(backend: Backend, user: UserRecord, input: CreateOrderInput) {
  const { state } = backend.db
  const quoteRecord = state.quotes.find(
    (item) => item.quote.id === input.quoteId && item.userId === user.id,
  )
  if (!quoteRecord) {
    throw fail.conflict(API_ERROR_CODES.quoteExpired, 'Cotação não encontrada. Revise os valores')
  }
  const connection = state.connections.find(
    (item) => item.id === input.connectionId && item.userId === user.id,
  )
  if (!connection) throw fail.validation({ connectionId: 'Conecte uma carteira para continuar' })
  if (
    connection.network !== quoteRecord.quote.network ||
    input.details.network !== connection.network
  ) {
    throw fail.validation({ network: 'A rede da carteira não corresponde à rede do pedido' })
  }
  const cart = state.carts.find((item) => item.id === quoteRecord.cartId)
  if (!cart) throw fail.conflict(API_ERROR_CODES.cartEmpty, 'Seu carrinho está vazio')
  return { quote: quoteRecord.quote, connection, cart }
}

export interface CreateOrderResult {
  order: Order
  // True when the idempotency key matched an earlier request
  replayed: boolean
  // Extra wait before answering (order-timeout scenario, first attempt only)
  responseDelayMs: number
}

export function createOrder(
  backend: Backend,
  user: UserRecord,
  request: { key: string | null; input: CreateOrderInput },
): CreateOrderResult {
  const { key, input } = request
  if (!key) throw fail.validation({ idempotencyKey: 'Cabeçalho Idempotency-Key obrigatório' })

  const { state } = backend.db
  const fingerprint = orderRequestFingerprint(input)
  const previous = state.idempotency.find((item) => item.key === key && item.userId === user.id)
  if (previous) {
    if (previous.fingerprint !== fingerprint) {
      throw fail.conflict(
        API_ERROR_CODES.idempotencyConflict,
        'Esta tentativa de compra já foi usada com outros dados',
      )
    }
    settleDueOrders(backend)
    return {
      order: findOrderRecord(backend, user, previous.orderId).order,
      replayed: true,
      responseDelayMs: 0,
    }
  }

  const { quote, connection, cart } = resolveOrderInputs(backend, user, input)
  assertQuoteCurrent(backend, quote, cart)

  const now = backend.now()
  const { payment, orderResponseDelayMs } = backend.scenario()
  const order: Order = {
    id: backend.db.nextId('order'),
    status: 'pending',
    quoteId: quote.id,
    lines: quote.lines,
    subtotal: quote.subtotal,
    discount: quote.discount,
    couponCode: quote.coupon?.code ?? null,
    network: quote.network,
    networkFee: quote.networkFee,
    total: quote.total,
    wallet: { provider: connection.provider, address: connection.address },
    transaction: null,
    refusalReason: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    version: 1,
  }
  const record: OrderRecord = {
    order,
    userId: user.id,
    cartId: cart.id,
    settleAt: new Date(now.getTime() + payment.delayMs).toISOString(),
    outcome: payment.outcome,
  }
  state.orders.push(record)
  state.idempotency.push({ key, userId: user.id, fingerprint, orderId: order.id })
  backend.db.commit()
  scheduleSettlement(backend, record)

  return { order, replayed: false, responseDelayMs: orderResponseDelayMs }
}

export function getOrder(backend: Backend, user: UserRecord, id: string): Order {
  settleDueOrders(backend)
  return findOrderRecord(backend, user, id).order
}
