import { z } from 'zod'

import type { CartLine } from './cart'
import { ethSchema } from './money'
import type { Nft } from './nft'
import { orderSchema } from './order'
import { isNewerVersion } from './versioning'

/**
 * Realtime envelope shared by every Socket.IO event: a stable id (dedup), the affected
 * resource and its version (ordering), and the user it belongs to (session isolation).
 */
const envelope = <Type extends string, Resource extends string, Data extends z.ZodType>(
  type: Type,
  resource: Resource,
  data: Data,
) =>
  z.object({
    id: z.string(),
    type: z.literal(type),
    resource: z.object({ type: z.literal(resource), id: z.string() }),
    version: z.number().int().min(1),
    occurredAt: z.iso.datetime(),
    // null = public event (catalog); otherwise only that user's session may apply it
    userId: z.string().nullable(),
    data,
  })

export const nftUpdatedEventSchema = envelope(
  'nft.updated',
  'nft',
  z.object({
    price: ethSchema,
    compareAtPrice: ethSchema.optional(),
    editions: z.array(
      z.object({ id: z.string(), price: ethSchema, available: z.number().int().min(0) }),
    ),
  }),
)

export const orderUpdatedEventSchema = envelope(
  'order.updated',
  'order',
  orderSchema.pick({ status: true, transaction: true, refusalReason: true, updatedAt: true }),
)

export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

/** True when the event may touch this session's data: public, or addressed to this user. */
export function isEventForUser(event: { userId: string | null }, userId: string | null): boolean {
  return event.userId === null || event.userId === userId
}

/**
 * Remembers recently seen event ids so duplicates are dropped before any side effect.
 * Bounded: the oldest ids are forgotten first. Version checks still cover anything older.
 */
export function createEventDeduper(capacity = 500) {
  const seen = new Set<string>()
  return {
    /** Returns true the first time an id is seen, false for duplicates. */
    accept(id: string): boolean {
      if (seen.has(id)) return false
      seen.add(id)
      if (seen.size > capacity) seen.delete(seen.values().next().value as string)
      return true
    },
    clear(): void {
      seen.clear()
    },
  }
}

// --- Applying nft.updated to cached data ------------------------------------------------------

/** Returns the NFT with the event applied, or the same object when the event is stale. */
export function applyNftUpdate<T extends Nft>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.resource.id || !isNewerVersion(nft.version, event.version)) return nft

  const byId = new Map(event.data.editions.map((edition) => [edition.id, edition]))
  return {
    ...nft,
    price: event.data.price,
    compareAtPrice: event.data.compareAtPrice,
    version: event.version,
    editions: nft.editions.map((edition) => ({ ...edition, ...byId.get(edition.id) })),
  }
}

/** Same for a cart line; the line keeps its quantity so the UI can flag stock problems. */
export function applyNftUpdateToCartLine(line: CartLine, event: NftUpdatedEvent): CartLine {
  if (line.nftId !== event.resource.id || !isNewerVersion(line.nftVersion, event.version)) {
    return line
  }
  const edition = event.data.editions.find(({ id }) => id === line.editionId)
  return {
    ...line,
    unitPrice: edition?.price ?? line.unitPrice,
    available: edition?.available ?? line.available,
    nftVersion: event.version,
  }
}
