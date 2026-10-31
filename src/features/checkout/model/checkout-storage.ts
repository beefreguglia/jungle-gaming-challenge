import { z } from 'zod'

import { walletConnectionSchema } from '@/domain/wallet'
import { createSafeStorage, type SafeStorage } from '@/shared/lib/storage'

import { type OrderAttempt, orderAttemptSchema } from './order-attempt'

const sessionArea = createSafeStorage('session')

/**
 * What the checkout keeps across a reload or a re-login after the session expires, per
 * user and per tab (sessionStorage): the form as typed, the wallet connection and the
 * purchase attempt still waiting for an answer.
 */
export const checkoutDraftSchema = z.object({
  values: z.record(z.string(), z.string()),
  walletChoice: z.string(),
  connection: walletConnectionSchema.nullable(),
})

export type CheckoutDraft = z.infer<typeof checkoutDraftSchema>

function slot<T>(storage: SafeStorage, key: string, schema: z.ZodType<T>) {
  return {
    get(): T | null {
      const raw = storage.get(key)
      if (!raw) return null
      try {
        const parsed = schema.safeParse(JSON.parse(raw))
        return parsed.success ? parsed.data : null
      } catch {
        return null
      }
    },
    set(value: T) {
      storage.set(key, JSON.stringify(value))
    },
    clear() {
      storage.remove(key)
    },
  }
}

export function createCheckoutStorage(userId: string, storage: SafeStorage = sessionArea) {
  const draft = slot<CheckoutDraft>(storage, `kurio:checkout-draft:${userId}`, checkoutDraftSchema)
  const attempt = slot<OrderAttempt>(storage, `kurio:order-attempt:${userId}`, orderAttemptSchema)
  return {
    draft,
    attempt,
    // Logout or another user: the typed data and wallet connection are private
    clear() {
      draft.clear()
      attempt.clear()
    },
  }
}

/** Forgets a user's checkout draft and pending attempt (kept on expiry, for the resume). */
export function forgetCheckout(userId: string): void {
  createCheckoutStorage(userId).clear()
}

export type CheckoutStorage = ReturnType<typeof createCheckoutStorage>
