import { toSocketIo } from '@mswjs/socket.io-binding'
import type { WebSocketHandlerConnection } from 'msw'

import { type NftUpdatedEvent, type OrderUpdatedEvent, REALTIME_EVENTS } from '@/domain/events'

import type { RealtimePublisher } from '../backend'
import type { OrderRecord } from '../db/database'
import type { NftRecord } from '../fixtures/nfts'
import type { Scenario } from '../scenarios'

type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent

interface ConnectedClient {
  userId: string | null
  emit: (event: RealtimeEvent) => void
  close: () => void
}

// Engine.IO heartbeat: the binding fakes the handshake but never pings, and the client
// drops the connection after pingInterval + pingTimeout without one
const PING_INTERVAL_MS = 20_000
const ENGINE_PING = '2'
// Socket.IO CONNECT packet from the client: "40" + optional JSON auth payload
const CONNECT_PACKET = /^40(\{.*\})?$/

export interface RealtimeHub extends RealtimePublisher {
  attach(connection: WebSocketHandlerConnection): void
  disconnectAll(): void
  replayLast(): void
  readonly connectedCount: number
  // User behind each open socket (null = visitor); shows which credentials a client used
  readonly connectedUserIds: (string | null)[]
}

interface HubOptions {
  scenario: () => Scenario
  // Maps the token from the client's `auth` to a user id; null for visitors/expired tokens
  resolveUserId: (token: string | null) => string | null
}

function parseAuthToken(raw: string): string | null | undefined {
  const match = raw.match(CONNECT_PACKET)
  if (!match) return undefined
  try {
    const auth = match[1] ? (JSON.parse(match[1]) as { token?: unknown }) : {}
    return typeof auth.token === 'string' ? auth.token : null
  } catch {
    return null
  }
}

/**
 * Bridges the mock database to Socket.IO clients. Services publish domain changes here;
 * the hub wraps them in the versioned envelope and sends them only to the right sessions.
 */
export function createRealtimeHub({ scenario, resolveUserId }: HubOptions): RealtimeHub {
  const clients = new Set<ConnectedClient>()
  let last: RealtimeEvent | null = null

  function broadcast(event: RealtimeEvent): void {
    last = event
    const targets = [...clients].filter(
      (client) => event.userId === null || client.userId === event.userId,
    )
    const copies = scenario().duplicateEvents
      ? [
          event,
          event,
          { ...event, id: crypto.randomUUID(), version: Math.max(1, event.version - 1) },
        ]
      : [event]
    for (const client of targets) for (const copy of copies) client.emit(copy)
  }

  const envelope = <T extends 'nft' | 'order'>(
    resource: { type: T; id: string },
    version: number,
  ) => ({
    id: crypto.randomUUID(),
    resource,
    version,
    occurredAt: new Date().toISOString(),
  })

  return {
    get connectedCount() {
      return clients.size
    },

    get connectedUserIds() {
      return [...clients].map((client) => client.userId)
    },

    attach(connection) {
      const io = toSocketIo(connection)
      const client: ConnectedClient = {
        userId: null,
        emit: (event) => io.client.emit(event.type, event),
        close: () => connection.client.close(4000, 'Mock disconnect'),
      }
      clients.add(client)

      connection.client.addEventListener('message', (message) => {
        const token = typeof message.data === 'string' ? parseAuthToken(message.data) : undefined
        if (token !== undefined) client.userId = resolveUserId(token)
      })
      const heartbeat = setInterval(() => connection.client.send(ENGINE_PING), PING_INTERVAL_MS)
      connection.client.addEventListener('close', () => {
        clearInterval(heartbeat)
        clients.delete(client)
      })
    },

    publishNft(nft: NftRecord) {
      broadcast({
        ...envelope({ type: 'nft', id: nft.id }, nft.version),
        type: REALTIME_EVENTS.nftUpdated,
        userId: null,
        data: {
          price: nft.price,
          compareAtPrice: nft.compareAtPrice,
          editions: nft.editions.map(({ id, price, available }) => ({ id, price, available })),
        },
      })
    },

    publishOrder({ order, userId }: OrderRecord) {
      broadcast({
        ...envelope({ type: 'order', id: order.id }, order.version),
        type: REALTIME_EVENTS.orderUpdated,
        userId,
        data: {
          status: order.status,
          transaction: order.transaction,
          refusalReason: order.refusalReason,
          updatedAt: order.updatedAt,
        },
      })
    },

    disconnectAll() {
      for (const client of clients) client.close()
    },

    replayLast() {
      if (last) broadcast(last)
    },
  }
}
