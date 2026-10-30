import { z } from 'zod'

import { ethSchema } from './money'
import { nftNetworkSchema } from './nft'
import { quoteLineSchema } from './quote'
import { usernameSchema } from './validation'
import { isNewerVersion } from './versioning'
import { refineWalletAddress, walletFieldsSchema, walletProviderSchema } from './wallet'

// Sent on POST /orders. Same key + same body → same order; same key + other body → 409.
export const IDEMPOTENCY_HEADER = 'Idempotency-Key'

export const ORDER_STATUSES = ['pending', 'confirmed', 'refused'] as const
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatusSchema>

// --- Checkout form ("Perfil do colecionador" in the Pagamento frame) ------------------------

export const checkoutDetailsSchema = walletFieldsSchema
  .omit({ nickname: true })
  .extend({
    username: usernameSchema,
    note: z.string().trim().max(500, 'Use no máximo 500 caracteres').optional(),
  })
  .superRefine(refineWalletAddress)

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>

export const createOrderInputSchema = z.object({
  quoteId: z.string(),
  // Wallet connection established in the checkout (POST /wallet-connections)
  connectionId: z.string(),
  details: checkoutDetailsSchema,
})

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

// --- Order / receipt ------------------------------------------------------------------------

/**
 * The order is the receipt: it stores a snapshot of the quote lines and totals, so later
 * catalog changes never alter what was bought or paid.
 */
export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  quoteId: z.string(),
  lines: z.array(quoteLineSchema).min(1),
  subtotal: ethSchema,
  discount: ethSchema,
  couponCode: z.string().nullable(),
  network: nftNetworkSchema,
  networkFee: ethSchema,
  total: ethSchema,
  wallet: z.object({ provider: walletProviderSchema, address: z.string() }),
  // Simulated on-chain reference; present once the order is confirmed
  transaction: z.object({ hash: z.string(), explorerUrl: z.string() }).nullable(),
  refusalReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  version: z.number().int().min(1),
})

export type Order = z.infer<typeof orderSchema>

export function isTerminalStatus(status: OrderStatus): boolean {
  return status !== 'pending'
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === 'pending' && to !== 'pending'
}

/**
 * Whether an incoming order state (from REST or `order.updated`) should replace the one the
 * client holds: it must be newer and must not move a terminal order.
 */
export function shouldApplyOrderUpdate(
  current: Pick<Order, 'status' | 'version'> | undefined,
  incoming: Pick<Order, 'status' | 'version'>,
): boolean {
  if (!current) return true
  if (!isNewerVersion(current.version, incoming.version)) return false
  return current.status === incoming.status || canTransition(current.status, incoming.status)
}

// --- Idempotency ----------------------------------------------------------------------------

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .toSorted(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** Order-independent fingerprint of a request body, compared when an idempotency key repeats. */
export function orderRequestFingerprint(input: CreateOrderInput): string {
  return stableStringify(input)
}
