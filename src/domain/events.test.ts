import { describe, expect, it } from 'vitest'

import type { CartLine } from './cart'
import {
  applyNftUpdate,
  applyNftUpdateToCartLine,
  createEventDeduper,
  isEventForUser,
  type NftUpdatedEvent,
} from './events'
import type { Nft } from './nft'

const nft: Nft = {
  id: 'n1',
  tokenId: '0042',
  name: 'Emerald Ape #042',
  description: '',
  collection: 'digital-art',
  series: 'Kurio Apes',
  network: 'ethereum',
  creator: { id: 'c1', name: 'Nova Sato' },
  rarity: 'common',
  images: [{ url: '/nfts/emerald-ape.webp', alt: 'Emerald Ape' }],
  price: '1.19',
  editions: [
    { id: 'e1', name: '1/1', price: '3', supply: 1, available: 1 },
    { id: 'e50', name: '1/50', price: '1.19', supply: 50, available: 12 },
  ],
  listedAt: '2026-10-01T12:00:00.000Z',
  version: 3,
}

function event(version: number): NftUpdatedEvent {
  return {
    id: `evt-${version}`,
    type: 'nft.updated',
    resource: { type: 'nft', id: 'n1' },
    version,
    occurredAt: '2026-10-30T12:00:00.000Z',
    userId: null,
    data: { price: '1.29', editions: [{ id: 'e50', price: '1.29', available: 0 }] },
  }
}

describe('applyNftUpdate', () => {
  it('applies a newer event and keeps untouched editions', () => {
    const updated = applyNftUpdate(nft, event(4))
    expect(updated.price).toBe('1.29')
    expect(updated.version).toBe(4)
    expect(updated.editions).toEqual([
      nft.editions[0],
      { id: 'e50', name: '1/50', price: '1.29', supply: 50, available: 0 },
    ])
  })

  it('returns the same object for stale or duplicate events', () => {
    expect(applyNftUpdate(nft, event(3))).toBe(nft)
    expect(applyNftUpdate(nft, event(2))).toBe(nft)
  })
})

describe('applyNftUpdateToCartLine', () => {
  const line = { nftId: 'n1', editionId: 'e50', unitPrice: '1.19', available: 12, nftVersion: 3 }

  it('updates price and stock but keeps the quantity', () => {
    const updated = applyNftUpdateToCartLine({ ...line, quantity: 2 } as CartLine, event(4))
    expect(updated).toMatchObject({ unitPrice: '1.29', available: 0, quantity: 2, nftVersion: 4 })
  })
})

describe('createEventDeduper', () => {
  it('accepts an id once and forgets the oldest beyond capacity', () => {
    const deduper = createEventDeduper(2)
    expect(deduper.accept('a')).toBe(true)
    expect(deduper.accept('a')).toBe(false)
    deduper.accept('b')
    deduper.accept('c')
    expect(deduper.accept('a')).toBe(true)
  })
})

describe('isEventForUser', () => {
  it('lets public events through and blocks other users', () => {
    expect(isEventForUser({ userId: null }, 'u1')).toBe(true)
    expect(isEventForUser({ userId: 'u1' }, 'u1')).toBe(true)
    expect(isEventForUser({ userId: 'u2' }, 'u1')).toBe(false)
    expect(isEventForUser({ userId: 'u1' }, null)).toBe(false)
  })
})
