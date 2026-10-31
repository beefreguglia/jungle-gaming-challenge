import { z } from 'zod'

import {
  type CreateOrderInput,
  createOrderInputSchema,
  orderRequestFingerprint,
} from '@/domain/order'

/**
 * One purchase attempt: the order body and the idempotency key that goes with it. Sending
 * the same body again (double click, retry after a timeout, reload) reuses the key, so the
 * API answers with the order it already created instead of charging twice.
 */
export const orderAttemptSchema = z.object({
  key: z.string(),
  fingerprint: z.string(),
  input: createOrderInputSchema,
})

export type OrderAttempt = z.infer<typeof orderAttemptSchema>

/** Same input → same attempt (same key); any other input is a new attempt with a new key. */
export function attemptFor(
  current: OrderAttempt | null,
  input: CreateOrderInput,
  newKey: () => string = () => crypto.randomUUID(),
): OrderAttempt {
  const fingerprint = orderRequestFingerprint(input)
  if (current?.fingerprint === fingerprint) return current
  return { key: newKey(), fingerprint, input }
}
