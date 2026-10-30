import { z } from 'zod'

import {
  addEth,
  compareEth,
  ethSchema,
  isEqualEth,
  percentOfEth,
  subtractEth,
  type Eth,
} from './money'
import { nftImageSchema, nftNetworkSchema } from './nft'

/**
 * A quote is the API's priced snapshot of the cart: subtotal, coupon discount, network fee
 * and total. The checkout confirms a specific quote id; if prices, stock or the coupon
 * changed since then, the API answers 409 `quote_outdated` and a new quote must be accepted.
 */
export const quoteLineSchema = z.object({
  lineId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: nftImageSchema,
  editionName: z.string(),
  unitPrice: ethSchema,
  quantity: z.number().int().min(1),
  total: ethSchema,
  nftVersion: z.number().int().min(1),
})

export const quoteSchema = z.object({
  id: z.string(),
  lines: z.array(quoteLineSchema).min(1),
  subtotal: ethSchema,
  discount: ethSchema,
  coupon: z.object({ code: z.string(), description: z.string() }).nullable(),
  network: nftNetworkSchema,
  networkFee: ethSchema,
  total: ethSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
})

export type QuoteLine = z.infer<typeof quoteLineSchema>
export type Quote = z.infer<typeof quoteSchema>

export const createQuoteInputSchema = z.object({
  network: nftNetworkSchema.default('ethereum'),
})

export type CreateQuoteInput = z.input<typeof createQuoteInputSchema>

// --- Coupons (evaluated by the API; shared so mocks and tests use one rule) -----------------

const couponBaseSchema = z.object({
  code: z.string(),
  description: z.string(),
  expiresAt: z.iso.datetime().nullable(),
})

export const couponSchema = z.discriminatedUnion('type', [
  couponBaseSchema.extend({ type: z.literal('percent'), percent: z.number().min(0).max(100) }),
  couponBaseSchema.extend({ type: z.literal('fixed'), amount: ethSchema }),
])

export type Coupon = z.infer<typeof couponSchema>

export function isCouponExpired(coupon: Pick<Coupon, 'expiresAt'>, now: Date): boolean {
  return coupon.expiresAt !== null && new Date(coupon.expiresAt).getTime() <= now.getTime()
}

/** Discount for a subtotal; never exceeds the subtotal itself. */
export function couponDiscount(coupon: Coupon, subtotal: Eth): Eth {
  const raw = coupon.type === 'percent' ? percentOfEth(subtotal, coupon.percent) : coupon.amount
  return compareEth(raw, subtotal) > 0 ? subtotal : raw
}

export function quoteTotal({
  subtotal,
  discount,
  networkFee,
}: Pick<Quote, 'subtotal' | 'discount' | 'networkFee'>): Eth {
  return addEth(subtractEth(subtotal, discount), networkFee)
}

export function isQuoteExpired(quote: Pick<Quote, 'expiresAt'>, now: Date): boolean {
  return new Date(quote.expiresAt).getTime() <= now.getTime()
}

// --- Change detection between quotes --------------------------------------------------------

export type QuoteChange =
  | { type: 'price'; lineId: string; name: string; from: Eth; to: Eth }
  | { type: 'quantity'; lineId: string; name: string; from: number; to: number }
  | { type: 'removed'; lineId: string; name: string }
  | { type: 'added'; lineId: string; name: string }
  | { type: 'fee'; from: Eth; to: Eth }
  | { type: 'discount'; from: Eth; to: Eth }

function lineChanges(previous: QuoteLine, next: QuoteLine | undefined): QuoteChange[] {
  const { lineId, name } = previous
  if (!next) return [{ type: 'removed', lineId, name }]

  const changes: QuoteChange[] = []
  if (!isEqualEth(previous.unitPrice, next.unitPrice)) {
    changes.push({ type: 'price', lineId, name, from: previous.unitPrice, to: next.unitPrice })
  }
  if (previous.quantity !== next.quantity) {
    changes.push({ type: 'quantity', lineId, name, from: previous.quantity, to: next.quantity })
  }
  return changes
}

/**
 * Lists what changed between the quote the user reviewed and a fresh one. A non-empty
 * result means the checkout must show the differences and ask for confirmation again.
 */
export function diffQuotes(previous: Quote, next: Quote): QuoteChange[] {
  const nextById = new Map(next.lines.map((line) => [line.lineId, line]))
  const previousIds = new Set(previous.lines.map((line) => line.lineId))

  const changes = previous.lines.flatMap((line) => lineChanges(line, nextById.get(line.lineId)))

  for (const line of next.lines) {
    if (!previousIds.has(line.lineId)) {
      changes.push({ type: 'added', lineId: line.lineId, name: line.name })
    }
  }
  if (!isEqualEth(previous.networkFee, next.networkFee)) {
    changes.push({ type: 'fee', from: previous.networkFee, to: next.networkFee })
  }
  if (!isEqualEth(previous.discount, next.discount)) {
    changes.push({ type: 'discount', from: previous.discount, to: next.discount })
  }
  return changes
}
