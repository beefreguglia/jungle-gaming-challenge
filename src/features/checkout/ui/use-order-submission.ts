import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import type { UseFormSetError } from 'react-hook-form'

import { API_ERROR_CODES } from '@/domain/errors'
import type { CreateOrderInput } from '@/domain/order'
import { useCartKey } from '@/features/cart'
import { isApiError } from '@/shared/api'
import { applyApiErrorToForm } from '@/shared/lib/form-errors'

import { usePlaceOrder } from '../api/order-queries'
import type { CheckoutStorage } from '../model/checkout-storage'
import { CHECKOUT_FIELDS, type CheckoutValues } from '../model/checkout-values'
import { attemptFor, type OrderAttempt } from '../model/order-attempt'

// The API refused the order because the cart, stock or prices moved: reload and review
const STALE_ORDER_CODES = new Set<string>([
  API_ERROR_CODES.quoteOutdated,
  API_ERROR_CODES.quoteExpired,
  API_ERROR_CODES.editionUnavailable,
  API_ERROR_CODES.cartEmpty,
])

export interface UnansweredOrder {
  attempt: OrderAttempt
  // timeout: this page gave up waiting; resumed: found after a reload or re-login
  reason: 'timeout' | 'resumed'
}

interface Options {
  storage: CheckoutStorage
  // Field errors go to the form; without one (resuming with an empty cart) they show inline
  setError?: UseFormSetError<CheckoutValues>
  onConnectionRefused?: (message: string) => void
}

/**
 * Sends the order under an idempotency key. Repeated clicks are ignored while a request
 * is out, and an attempt without an answer (timeout, reload) is kept, so checking it
 * reuses the key and the API returns the order it already created.
 */
export function useOrderSubmission({ storage, setError, onConnectionRefused }: Options) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cartKey = useCartKey()
  const place = usePlaceOrder()
  const sending = useRef(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [unanswered, setUnanswered] = useState<UnansweredOrder | null>(() => {
    const attempt = storage.attempt.get()
    return attempt ? { attempt, reason: 'resumed' } : null
  })

  function fail(error: unknown, attempt: OrderAttempt) {
    if (isApiError(error) && error.isRetryable) {
      setUnanswered({ attempt, reason: 'timeout' })
      return
    }
    storage.attempt.clear()
    if (isApiError(error) && error.code && STALE_ORDER_CODES.has(error.code)) {
      setFormError(error.message)
      // The cart and its quote reload; what changed shows up for a new confirmation
      if (cartKey) void queryClient.invalidateQueries({ queryKey: cartKey })
      return
    }
    if (isApiError(error) && error.fields?.connectionId && onConnectionRefused) {
      onConnectionRefused(error.fields.connectionId)
      return
    }
    setFormError(
      setError
        ? applyApiErrorToForm(error, { setError, fields: CHECKOUT_FIELDS })
        : applyApiErrorToForm(error, { setError: () => {}, fields: [] }),
    )
  }

  function send(attempt: OrderAttempt) {
    if (sending.current) return
    sending.current = true
    storage.attempt.set(attempt)
    setUnanswered(null)
    setFormError(null)
    place.mutate(attempt, {
      onSuccess: (order) => {
        storage.attempt.clear()
        void navigate({ to: '/checkout', search: { pedido: order.id } })
      },
      onError: (error) => fail(error, attempt),
      onSettled: () => {
        sending.current = false
      },
    })
  }

  return {
    // Same body as the stored attempt → same key (double submit, retry); otherwise a new one
    submit: (input: CreateOrderInput) => send(attemptFor(storage.attempt.get(), input)),
    retry: () => unanswered && send(unanswered.attempt),
    unanswered,
    pending: place.isPending,
    formError,
    setFormError,
  }
}
