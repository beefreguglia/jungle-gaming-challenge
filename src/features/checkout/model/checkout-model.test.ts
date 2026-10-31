import { describe, expect, it } from 'vitest'

import type { CreateOrderInput } from '@/domain/order'
import type { Quote } from '@/domain/quote'
import { createSafeStorage } from '@/shared/lib/storage'

import { createCheckoutStorage } from './checkout-storage'
import { attemptFor } from './order-attempt'
import { describeQuoteChange, reviewQuote } from './quote-review'

const input: CreateOrderInput = {
  quoteId: 'quote-1',
  connectionId: 'conn-1',
  details: {
    displayName: 'Nova Sato',
    username: 'nova',
    network: 'ethereum',
    profileName: 'Nova',
    address: '0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8',
    provider: 'metamask',
    referralCode: 'KURIO2026',
    email: 'nova@kurio.art',
    ensLabel: 'novasato',
  },
}

const line = {
  lineId: 'line-1',
  nftId: 'emerald-ape-042',
  editionId: 'emerald-ape-042-1of50',
  name: 'Emerald Ape #042',
  tokenId: '0042',
  image: { url: '/images/nfts/emerald-ape.webp', alt: 'Emerald Ape' },
  editionName: '1/50',
  unitPrice: '1.19',
  quantity: 2,
  total: '2.38',
  nftVersion: 1,
}

const quote: Quote = {
  id: 'quote-1',
  lines: [line],
  subtotal: '2.38',
  discount: '0',
  coupon: null,
  network: 'ethereum',
  networkFee: '0.016',
  total: '2.396',
  createdAt: '2026-10-30T12:00:00.000Z',
  expiresAt: '2026-10-30T12:05:00.000Z',
}

describe('attemptFor', () => {
  it('keeps the idempotency key while the order body is the same', () => {
    let next = 0
    const newKey = () => `key-${++next}`
    const first = attemptFor(null, input, newKey)
    // Same content in another key order: still the same attempt
    const again = attemptFor(
      first,
      { details: input.details, connectionId: 'conn-1', quoteId: 'quote-1' },
      newKey,
    )
    expect(again).toBe(first)
    expect(first.key).toBe('key-1')
  })

  it('starts a new attempt when anything in the body changes', () => {
    const first = attemptFor(null, input, () => 'key-1')
    const changed = attemptFor(first, { ...input, quoteId: 'quote-2' }, () => 'key-2')
    expect(changed.key).toBe('key-2')
  })
})

describe('reviewQuote', () => {
  it('takes the first quote and re-issued quotes with the same values silently', () => {
    expect(reviewQuote(null, quote)).toEqual({ reviewed: quote, changes: [] })
    const reissued = { ...quote, id: 'quote-2' }
    expect(reviewQuote(quote, reissued)).toEqual({ reviewed: reissued, changes: [] })
  })

  it('does not ask again when the user picks another network', () => {
    const polygon = { ...quote, id: 'quote-2', network: 'polygon' as const, networkFee: '0.002' }
    expect(reviewQuote(quote, polygon).changes).toEqual([])
  })

  it('keeps the reviewed quote and lists price changes until they are accepted', () => {
    const pricier = {
      ...quote,
      id: 'quote-2',
      lines: [{ ...line, unitPrice: '1.29', total: '2.58' }],
    }
    const review = reviewQuote(quote, pricier)
    expect(review.reviewed).toBe(quote)
    expect(review.changes.map(describeQuoteChange)).toEqual([
      'Emerald Ape #042: preço de 1.19 ETH para 1.29 ETH',
    ])
  })
})

describe('createCheckoutStorage', () => {
  it('keeps drafts per user and ignores corrupted entries', () => {
    const storage = createSafeStorage('session')
    const nova = createCheckoutStorage('user-nova', storage)
    const kai = createCheckoutStorage('user-kai', storage)
    nova.draft.set({ values: { username: 'nova' }, walletChoice: 'primary', connection: null })
    expect(nova.draft.get()?.values.username).toBe('nova')
    expect(kai.draft.get()).toBeNull()

    storage.set('kurio:order-attempt:user-nova', '{broken')
    expect(nova.attempt.get()).toBeNull()
  })
})
