import { describe, expect, it } from 'vitest'

import {
  canCheckout,
  type CartLine,
  cartItemCount,
  cartLineStatus,
  cartSubtotal,
  mergeCartLines,
} from './cart'

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    id: 'l1',
    nftId: 'n1',
    editionId: 'e1',
    quantity: 1,
    name: 'Emerald Ape #042',
    tokenId: '0042',
    image: { url: '/nfts/emerald-ape.webp', alt: 'Emerald Ape' },
    editionName: '1/50',
    unitPrice: '1.19',
    available: 10,
    nftVersion: 1,
    ...overrides,
  }
}

describe('cartLineStatus', () => {
  it('flags sold-out and over-stock lines', () => {
    expect(cartLineStatus(line())).toBe('ok')
    expect(cartLineStatus(line({ available: 0 }))).toBe('sold_out')
    expect(cartLineStatus(line({ quantity: 3, available: 2 }))).toBe('exceeds_stock')
  })
})

describe('totals', () => {
  it('sums line totals with decimal precision', () => {
    const lines = [line({ quantity: 2 }), line({ id: 'l2', unitPrice: '1.39', quantity: 6 })]
    expect(cartSubtotal(lines)).toBe('10.72')
  })

  it('counts units for the badge', () => {
    expect(cartItemCount({ lines: [line({ quantity: 2 }), line({ id: 'l2', quantity: 3 })] })).toBe(
      5,
    )
    expect(cartItemCount(undefined)).toBe(0)
  })
})

describe('canCheckout', () => {
  it('requires a non-empty cart with every line purchasable', () => {
    expect(canCheckout({ lines: [] })).toBe(false)
    expect(canCheckout({ lines: [line()] })).toBe(true)
    expect(canCheckout({ lines: [line(), line({ id: 'l2', available: 0 })] })).toBe(false)
  })
})

describe('mergeCartLines', () => {
  it('adds quantities of the same edition, capped by stock', () => {
    const merged = mergeCartLines(
      [line({ quantity: 2, available: 4 })],
      [line({ id: 'visitor', quantity: 3, available: 4 })],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ id: 'l1', quantity: 4 })
  })

  it('keeps visitor-only lines and different editions apart', () => {
    const merged = mergeCartLines(
      [line()],
      [line({ id: 'l2', editionId: 'e2' }), line({ id: 'l3', nftId: 'n2' })],
    )
    expect(merged.map((item) => item.id)).toEqual(['l1', 'l2', 'l3'])
  })
})
