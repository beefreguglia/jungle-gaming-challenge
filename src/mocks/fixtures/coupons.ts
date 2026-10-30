import type { Coupon } from '@/domain/quote'

/**
 * Deterministic coupons:
 * - GENESIS10 → valid, 10% off
 * - KURIO05   → valid, 0.05 ETH off
 * - VERAO25   → expired
 * Any other code → invalid.
 */
export const COUPONS: Coupon[] = [
  {
    code: 'GENESIS10',
    description: 'Lançamento gênesis: 10% de desconto',
    type: 'percent',
    percent: 10,
    expiresAt: null,
  },
  {
    code: 'KURIO05',
    description: 'Boas-vindas: 0,05 ETH de desconto',
    type: 'fixed',
    amount: '0.05',
    expiresAt: null,
  },
  {
    code: 'VERAO25',
    description: 'Verão: 25% de desconto',
    type: 'percent',
    percent: 25,
    expiresAt: '2026-03-20T00:00:00.000Z',
  },
]

export function findCoupon(code: string): Coupon | undefined {
  return COUPONS.find((coupon) => coupon.code === code.trim().toUpperCase())
}
