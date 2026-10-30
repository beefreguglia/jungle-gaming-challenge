import { z } from 'zod'

import { ethSchema, multiplyEth, sumEth, type Eth } from './money'
import { nftImageSchema } from './nft'

/**
 * The cart lives on the API for visitors and members alike. A visitor cart is addressed by
 * the `X-Cart-Id` header; after login the API merges it into the member's cart.
 */
export const cartLineSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
  // Display data, refreshed by the API on every read
  name: z.string(),
  tokenId: z.string(),
  image: nftImageSchema,
  editionName: z.string(),
  // Current price and stock of the edition (not the price when it was added)
  unitPrice: ethSchema,
  available: z.number().int().min(0),
  nftVersion: z.number().int().min(1),
})

export const cartSchema = z.object({
  id: z.string(),
  lines: z.array(cartLineSchema),
  couponCode: z.string().nullable(),
  updatedAt: z.iso.datetime(),
})

export type CartLine = z.infer<typeof cartLineSchema>
export type Cart = z.infer<typeof cartSchema>

export const addCartItemInputSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
})

export const updateCartItemInputSchema = z.object({
  quantity: z.number().int().min(1),
})

export const applyCouponInputSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Informe o código promocional').max(32),
})

export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>
export type ApplyCouponInput = z.infer<typeof applyCouponInputSchema>

export type CartLineStatus = 'ok' | 'sold_out' | 'exceeds_stock'

export function cartLineStatus(line: Pick<CartLine, 'quantity' | 'available'>): CartLineStatus {
  if (line.available === 0) return 'sold_out'
  if (line.quantity > line.available) return 'exceeds_stock'
  return 'ok'
}

export function cartLineTotal(line: Pick<CartLine, 'unitPrice' | 'quantity'>): Eth {
  return multiplyEth(line.unitPrice, line.quantity)
}

/** Client-side estimate shown while the API quote loads; the quote is the reference. */
export function cartSubtotal(lines: readonly CartLine[]): Eth {
  return sumEth(lines.map(cartLineTotal))
}

/** Units in the cart, for the header/tab bar badge. */
export function cartItemCount(cart: Pick<Cart, 'lines'> | undefined): number {
  return cart?.lines.reduce((count, line) => count + line.quantity, 0) ?? 0
}

export function canCheckout(cart: Pick<Cart, 'lines'>): boolean {
  return cart.lines.length > 0 && cart.lines.every((line) => cartLineStatus(line) === 'ok')
}

type MergeableLine = Pick<CartLine, 'nftId' | 'editionId' | 'quantity' | 'available'>

const lineKey = (line: MergeableLine) => `${line.nftId}:${line.editionId}`

/**
 * Merges a visitor cart into a member cart on login. Lines for the same edition add up,
 * capped by stock, so logging in never silently drops or overbooks items.
 */
export function mergeCartLines<T extends MergeableLine>(
  memberLines: readonly T[],
  visitorLines: readonly T[],
): T[] {
  const merged = new Map(memberLines.map((line) => [lineKey(line), { ...line }]))

  for (const line of visitorLines) {
    const existing = merged.get(lineKey(line))
    const quantity = (existing?.quantity ?? 0) + line.quantity
    merged.set(lineKey(line), {
      ...(existing ?? line),
      quantity: Math.max(1, Math.min(quantity, line.available)),
    })
  }

  return [...merged.values()]
}
