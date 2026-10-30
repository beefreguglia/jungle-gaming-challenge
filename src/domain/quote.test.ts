import { describe, expect, it } from 'vitest'

import {
  type Coupon,
  couponDiscount,
  diffQuotes,
  isCouponExpired,
  type Quote,
  type QuoteLine,
  quoteTotal,
} from './quote'

const percent10: Coupon = {
  code: 'GENESIS10',
  description: '10% de desconto',
  type: 'percent',
  percent: 10,
  expiresAt: null,
}

function quoteLine(overrides: Partial<QuoteLine> = {}): QuoteLine {
  return {
    lineId: 'l1',
    nftId: 'n1',
    editionId: 'e1',
    name: 'Emerald Ape #042',
    tokenId: '0042',
    image: { url: '/nfts/emerald-ape.webp', alt: 'Emerald Ape' },
    editionName: '1/50',
    unitPrice: '1.19',
    quantity: 2,
    total: '2.38',
    nftVersion: 1,
    ...overrides,
  }
}

function quote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'q1',
    lines: [quoteLine()],
    subtotal: '2.38',
    discount: '0',
    coupon: null,
    network: 'ethereum',
    networkFee: '0.016',
    total: '2.396',
    createdAt: '2026-10-30T12:00:00.000Z',
    expiresAt: '2026-10-30T12:05:00.000Z',
    ...overrides,
  }
}

describe('coupons', () => {
  it('computes percent and fixed discounts', () => {
    expect(couponDiscount(percent10, '26.83')).toBe('2.683')
    expect(couponDiscount({ ...percent10, type: 'fixed', amount: '0.5' }, '26.83')).toBe('0.5')
  })

  it('never discounts more than the subtotal', () => {
    expect(couponDiscount({ ...percent10, type: 'fixed', amount: '5' }, '1.19')).toBe('1.19')
  })

  it('detects expiry', () => {
    const now = new Date('2026-10-30T12:00:00.000Z')
    expect(isCouponExpired({ expiresAt: '2026-10-29T00:00:00.000Z' }, now)).toBe(true)
    expect(isCouponExpired({ expiresAt: null }, now)).toBe(false)
  })
})

describe('quoteTotal', () => {
  it('matches the Figma summary: 26.83 - 0 + 0.016', () => {
    expect(quoteTotal({ subtotal: '26.83', discount: '0', networkFee: '0.016' })).toBe('26.846')
  })
})

describe('diffQuotes', () => {
  it('returns nothing for equivalent quotes', () => {
    expect(diffQuotes(quote(), quote({ id: 'q2', total: '2.3960' }))).toEqual([])
  })

  it('reports price, quantity, removal, addition and fee changes', () => {
    const next = quote({
      lines: [
        quoteLine({ unitPrice: '1.29', quantity: 1 }),
        quoteLine({ lineId: 'l9', name: 'Golden Beat #207' }),
      ],
      networkFee: '0.02',
    })
    expect(diffQuotes(quote(), next)).toEqual([
      { type: 'price', lineId: 'l1', name: 'Emerald Ape #042', from: '1.19', to: '1.29' },
      { type: 'quantity', lineId: 'l1', name: 'Emerald Ape #042', from: 2, to: 1 },
      { type: 'added', lineId: 'l9', name: 'Golden Beat #207' },
      { type: 'fee', from: '0.016', to: '0.02' },
    ])
    expect(diffQuotes(quote(), quote({ lines: [quoteLine({ lineId: 'l2' })] }))).toContainEqual({
      type: 'removed',
      lineId: 'l1',
      name: 'Emerald Ape #042',
    })
  })
})
