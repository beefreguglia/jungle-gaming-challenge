import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { API_PATHS } from '@/domain/api-contract'
import { IDEMPOTENCY_HEADER, type Order, orderSchema, shouldApplyOrderUpdate } from '@/domain/order'
import { useCartKey } from '@/features/cart'
import { useSession, userKey } from '@/features/session'
import {
  type HttpClient,
  type RealtimeApplier,
  useHttpClient,
  useRealtimeStatus,
} from '@/shared/api'

import type { OrderAttempt } from '../model/order-attempt'

// The client gives up waiting after this; the order may still exist (see OrderAttempt)
const ORDER_TIMEOUT_MS = 8000
// Pending orders are polled: often while the socket is down, rarely as a safety net
const POLL_OFFLINE_MS = 2000
const POLL_ONLINE_MS = 10_000

const orderKey = (userId: string, orderId: string) => userKey(userId, 'orders', orderId)

export function useCheckoutUserId(): string {
  const { session } = useSession()
  // Checkout and orders live under the _authenticated guard
  return session?.user.id ?? ''
}

export function orderQueryOptions(http: HttpClient, userId: string, orderId: string) {
  return queryOptions({
    queryKey: orderKey(userId, orderId),
    queryFn: ({ signal }) => http.get(API_PATHS.order(orderId), { schema: orderSchema, signal }),
    // A late REST answer never moves the order back (e.g. pending after a confirmed event)
    structuralSharing: (previous: unknown, next: unknown) => {
      const current = previous as Order | undefined
      const incoming = next as Order
      return current && !shouldApplyOrderUpdate(current, incoming) ? current : incoming
    },
    meta: { realtime: true },
  })
}

/**
 * Order state: `order.updated` events drive it; while pending it is also polled, every
 * 2 s if the socket is down (recovery without realtime) and every 10 s otherwise. Once
 * confirmed, the cart is reloaded, since the API removed the purchased items.
 */
export function useOrder(orderId: string) {
  const http = useHttpClient()
  const userId = useCheckoutUserId()
  const realtime = useRealtimeStatus()
  const queryClient = useQueryClient()
  const cartKey = useCartKey()
  const query = useQuery({
    ...orderQueryOptions(http, userId, orderId),
    refetchInterval: ({ state }) => {
      if (state.data?.status !== 'pending') return false
      return realtime === 'connected' ? POLL_ONLINE_MS : POLL_OFFLINE_MS
    },
  })

  const confirmed = query.data?.status === 'confirmed'
  useEffect(() => {
    if (confirmed && cartKey) void queryClient.invalidateQueries({ queryKey: cartKey })
  }, [confirmed, cartKey, queryClient])

  return query
}

const isOrderKey = (key: readonly unknown[], orderId: string) =>
  key[0] === 'user' && key[2] === 'orders' && key[3] === orderId

/** `order.updated` → status, transaction and refusal of the cached order, newest only. */
export const orderRealtimeApplier: RealtimeApplier = {
  event: 'order.updated',
  apply(queryClient, event) {
    queryClient.setQueriesData<Order>(
      { predicate: (query) => isOrderKey(query.queryKey, event.resource.id) },
      (order) => {
        if (!order) return order
        const incoming = { status: event.data.status, version: event.version }
        return shouldApplyOrderUpdate(order, incoming)
          ? { ...order, ...event.data, version: event.version }
          : order
      },
    )
  },
}

/** POST /orders with the attempt's idempotency key; the answer seeds the order cache. */
export function usePlaceOrder() {
  const http = useHttpClient()
  const userId = useCheckoutUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (attempt: OrderAttempt) =>
      http.post(API_PATHS.orders, attempt.input, {
        headers: { [IDEMPOTENCY_HEADER]: attempt.key },
        schema: orderSchema,
        timeoutMs: ORDER_TIMEOUT_MS,
      }),
    onSuccess: (order) => {
      queryClient.setQueryData<Order>(orderKey(userId, order.id), (current) =>
        current && !shouldApplyOrderUpdate(current, order) ? current : order,
      )
    },
  })
}
