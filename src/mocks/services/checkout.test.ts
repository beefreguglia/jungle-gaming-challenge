import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkoutDetailsSchema } from '@/domain/order'

import { DEMO_PASSWORD } from '../fixtures/users'
import { createTestBackend } from '../testing'
import { addItem, mergeVisitorCart, resolveCart, setCoupon } from './cart'
import { findNftRecord, updateEdition } from './catalog'
import { connectWallet, createOrder, createQuote, getOrder } from './checkout'
import { requireUser, signIn } from './session'

const EMERALD = { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50' }

const details = checkoutDetailsSchema.parse({
  displayName: 'Nova Sato',
  username: 'nova_sato',
  network: 'ethereum',
  profileName: 'Nova',
  address: '0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8',
  provider: 'metamask',
  referralCode: 'KURIO2026',
  email: 'nova@kurio.art',
  ensLabel: 'novasato',
})

async function checkoutSetup(overrides = {}) {
  const context = createTestBackend(overrides)
  const { backend } = context
  const session = await signIn(backend, { email: 'nova@kurio.art', password: DEMO_PASSWORD })
  const user = requireUser(backend, `Bearer ${session.token}`)
  const cart = resolveCart(backend, { user, cartId: null })
  addItem(backend, cart, { ...EMERALD, quantity: 2 })
  const quote = createQuote(backend, { cart, user, network: 'ethereum' })
  const connection = connectWallet(backend, user, {
    provider: 'metamask',
    network: 'ethereum',
    address: details.address,
  })
  const input = { quoteId: quote.id, connectionId: connection.id, details }
  return { ...context, user, cart, quote, input }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('cart', () => {
  it('rejects more units than the edition has', () => {
    const { backend } = createTestBackend()
    const cart = resolveCart(backend, { user: null, cartId: null })
    expect(() => addItem(backend, cart, { ...EMERALD, quantity: 25 })).toThrow(
      expect.objectContaining({ status: 409, code: 'quantity_exceeded' }),
    )
  })

  it('validates coupons: invalid and expired', () => {
    const { backend } = createTestBackend()
    const cart = resolveCart(backend, { user: null, cartId: null })
    expect(() => setCoupon(backend, cart, 'NOPE')).toThrow(
      expect.objectContaining({ code: 'coupon_invalid' }),
    )
    expect(() => setCoupon(backend, cart, 'VERAO25')).toThrow(
      expect.objectContaining({ code: 'coupon_expired' }),
    )
    expect(setCoupon(backend, cart, 'genesis10').couponCode).toBe('GENESIS10')
  })

  it('merges the visitor cart into the member cart on login', async () => {
    const { backend } = createTestBackend()
    const visitorCart = resolveCart(backend, { user: null, cartId: null })
    addItem(backend, visitorCart, { ...EMERALD, quantity: 1 })

    const session = await signIn(backend, { email: 'kai@kurio.art', password: DEMO_PASSWORD })
    const merged = mergeVisitorCart(
      backend,
      requireUser(backend, `Bearer ${session.token}`),
      visitorCart.id,
    )

    expect(merged.lines).toHaveLength(1)
    expect(backend.db.state.carts.some((cart) => cart.id === visitorCart.id)).toBe(false)
  })
})

describe('quote', () => {
  it('prices the cart with the network fee', async () => {
    const { quote } = await checkoutSetup()
    expect(quote).toMatchObject({ subtotal: '2.38', networkFee: '0.016', total: '2.396' })
  })
})

describe('createOrder', () => {
  it('returns the same order for a repeated key and body', async () => {
    const { backend, user, input } = await checkoutSetup()
    const first = createOrder(backend, user, { key: 'k1', input })
    const again = createOrder(backend, user, { key: 'k1', input })
    expect(again.replayed).toBe(true)
    expect(again.order.id).toBe(first.order.id)
    expect(backend.db.state.orders).toHaveLength(1)
  })

  it('rejects a reused key with a different body', async () => {
    const { backend, user, input } = await checkoutSetup()
    createOrder(backend, user, { key: 'k1', input })
    const changed = { ...input, details: { ...input.details, note: 'outra' } }
    expect(() => createOrder(backend, user, { key: 'k1', input: changed })).toThrow(
      expect.objectContaining({ code: 'idempotency_conflict' }),
    )
  })

  it('refuses an outdated quote after a price change', async () => {
    const { backend, user, input } = await checkoutSetup()
    updateEdition(backend, EMERALD, { price: '1.5' })
    expect(() => createOrder(backend, user, { key: 'k1', input })).toThrow(
      expect.objectContaining({ status: 409, code: 'quote_outdated' }),
    )
  })

  it('confirms after the payment delay, consuming stock and the purchased cart lines', async () => {
    const { backend, user, cart, input, realtime } = await checkoutSetup()
    const stock = findNftRecord(backend, EMERALD.nftId).editions[2]?.available ?? 0
    const { order } = createOrder(backend, user, { key: 'k1', input })
    expect(order.status).toBe('pending')

    vi.advanceTimersByTime(1000)

    const settled = getOrder(backend, user, order.id)
    expect(settled.status).toBe('confirmed')
    expect(settled.transaction?.hash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(settled.version).toBe(2)
    expect(findNftRecord(backend, EMERALD.nftId).editions[2]?.available).toBe(stock - 2)
    expect(cart.items).toHaveLength(0)
    expect(realtime.publishOrder).toHaveBeenCalledOnce()
  })

  it('refuses in the payment-refused scenario and keeps the cart', async () => {
    const { backend, user, cart, input } = await checkoutSetup({
      payment: { outcome: 'refused', delayMs: 100 },
    })
    const { order } = createOrder(backend, user, { key: 'k1', input })
    vi.advanceTimersByTime(200)
    expect(getOrder(backend, user, order.id).status).toBe('refused')
    expect(cart.items).toHaveLength(1)
  })

  it('hides other users’ orders', async () => {
    const { backend, user, input } = await checkoutSetup()
    const { order } = createOrder(backend, user, { key: 'k1', input })
    const kai = backend.db.state.users.find((item) => item.id === 'user-kai')
    expect(() => getOrder(backend, kai!, order.id)).toThrow(
      expect.objectContaining({ status: 404 }),
    )
  })
})
