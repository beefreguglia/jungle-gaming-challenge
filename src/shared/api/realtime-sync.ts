import type { QueryClient } from '@tanstack/react-query'
import type { ZodType } from 'zod'

import {
  createEventDeduper,
  isEventForUser,
  type NftUpdatedEvent,
  nftUpdatedEventSchema,
  type OrderUpdatedEvent,
  orderUpdatedEventSchema,
  REALTIME_EVENTS,
} from '@/domain/events'

import type { RealtimeClient } from './realtime-client'

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      // Refetched after a realtime reconnection, since events may have been missed
      realtime?: boolean
    }
  }
}

/**
 * How a feature applies an event to its cached data. Features export appliers; the app
 * passes them here. A new event consumer is a new entry, the dispatcher never changes.
 */
export type RealtimeApplier =
  | { event: 'nft.updated'; apply: (queryClient: QueryClient, event: NftUpdatedEvent) => void }
  | {
      event: 'order.updated'
      apply: (queryClient: QueryClient, event: OrderUpdatedEvent) => void
    }

type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

const EVENT_SCHEMAS: Record<RealtimeEvent['type'], ZodType<RealtimeEvent>> = {
  [REALTIME_EVENTS.nftUpdated]: nftUpdatedEventSchema,
  [REALTIME_EVENTS.orderUpdated]: orderUpdatedEventSchema,
}

interface RealtimeSyncOptions {
  client: RealtimeClient
  queryClient: QueryClient
  // Current session user; events addressed to anyone else are dropped
  getUserId: () => string | null
  appliers: readonly RealtimeApplier[]
}

export interface RealtimeSync {
  // Called on login/logout: forgets seen ids so the new session starts clean
  resetSession(): void
  // Refetches every active query flagged `meta.realtime`
  reconcile(): Promise<void>
  dispose(): void
}

/**
 * Validates, deduplicates and scopes incoming events before any cache write, then
 * reconciles with REST after each reconnection (events sent while offline are lost).
 * Version ordering is enforced by the appliers through the domain rules.
 */
export function createRealtimeSync({
  client,
  queryClient,
  getUserId,
  appliers,
}: RealtimeSyncOptions): RealtimeSync {
  const deduper = createEventDeduper()
  let connectedBefore = false

  function dispatch(event: RealtimeEvent): void {
    for (const applier of appliers) {
      // The discriminant guarantees the event matches the applier's expected type
      if (applier.event === event.type) applier.apply(queryClient, event as never)
    }
  }

  function reconcile(): Promise<void> {
    return queryClient.invalidateQueries({
      predicate: (query) => query.meta?.realtime === true,
      refetchType: 'active',
    })
  }

  const unsubscribers = Object.entries(EVENT_SCHEMAS).map(([name, schema]) =>
    client.on(name, (payload) => {
      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        console.warn(`[realtime] Ignored malformed "${name}" event`, parsed.error)
        return
      }
      const event = parsed.data
      if (!isEventForUser(event, getUserId()) || !deduper.accept(event.id)) return
      dispatch(event)
    }),
  )

  unsubscribers.push(
    client.onStatus((status) => {
      if (status !== 'connected') return
      if (connectedBefore) void reconcile()
      connectedBefore = true
    }),
  )

  return {
    resetSession: () => deduper.clear(),
    reconcile,
    dispose() {
      for (const unsubscribe of unsubscribers) unsubscribe()
    },
  }
}
