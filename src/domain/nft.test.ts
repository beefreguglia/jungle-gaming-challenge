import { describe, expect, it } from 'vitest'

import {
  clampQuantity,
  defaultEdition,
  defaultNftListParams,
  isInvalidPriceRange,
  isOnSale,
  isSoldOut,
  type Nft,
  type NftEdition,
  nftEditionSchema,
  nftListParamsSchema,
  nftSchema,
  updateNftListParams,
} from './nft'
import { DEFAULT_PAGE_SIZE } from './pagination'

function edition(overrides: Partial<NftEdition> = {}): NftEdition {
  return { id: 'e1', name: 'Standard', price: '1', supply: 10, available: 5, ...overrides }
}

function nft(editions: NftEdition[]): Nft {
  return {
    id: 'n1',
    tokenId: '0001',
    name: 'Aurora',
    description: 'Generative piece',
    collection: 'generative',
    series: 'Kurio Apes',
    network: 'ethereum',
    creator: { id: 'c1', name: 'Ana' },
    rarity: 'common',
    images: [{ url: '/nfts/aurora.webp', alt: 'Aurora' }],
    price: '1',
    editions,
    listedAt: '2026-10-01T12:00:00.000Z',
    version: 1,
  }
}

describe('nftSchema', () => {
  it('accepts a well-formed NFT', () => {
    expect(nftSchema.safeParse(nft([edition()])).success).toBe(true)
  })

  it('rejects numeric prices: ETH must travel as decimal strings', () => {
    expect(nftSchema.safeParse({ ...nft([edition()]), price: 1 }).success).toBe(false)
  })

  it('rejects an edition with more available than supply', () => {
    expect(nftEditionSchema.safeParse(edition({ available: 11 })).success).toBe(false)
  })
})

describe('isOnSale', () => {
  it('requires a previous price above the current one', () => {
    expect(isOnSale({ ...nft([edition()]), compareAtPrice: '2.29', price: '1.99' })).toBe(true)
    expect(isOnSale({ ...nft([edition()]), compareAtPrice: '1', price: '1' })).toBe(false)
    expect(isOnSale(nft([edition()]))).toBe(false)
  })
})

describe('availability', () => {
  it('detects a sold-out NFT', () => {
    expect(isSoldOut(nft([edition({ available: 0 })]))).toBe(true)
    expect(isSoldOut(nft([edition({ available: 0 }), edition({ id: 'e2' })]))).toBe(false)
  })

  it('clamps quantity to the edition stock', () => {
    expect(clampQuantity(edition({ available: 3 }), 5)).toBe(3)
    expect(clampQuantity(edition({ available: 3 }), 2.7)).toBe(2)
    expect(clampQuantity(edition({ available: 3 }), -1)).toBe(0)
    expect(clampQuantity(edition({ available: 0 }), 1)).toBe(0)
  })

  it('defaults to the cheapest edition with stock', () => {
    const editions = [
      edition({ id: 'cheap-sold-out', price: '0.1', available: 0 }),
      edition({ id: 'pricey', price: '2' }),
      edition({ id: 'cheapest', price: '0.5' }),
    ]
    expect(defaultEdition(nft(editions)).id).toBe('cheapest')
  })

  it('falls back to the first edition when everything is sold out', () => {
    const editions = [edition({ id: 'a', available: 0 }), edition({ id: 'b', available: 0 })]
    expect(defaultEdition(nft(editions)).id).toBe('a')
  })
})

describe('nftListParamsSchema', () => {
  it('fills defaults for an empty URL', () => {
    expect(defaultNftListParams).toEqual({
      view: 'all',
      sort: 'recent',
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  })

  it('falls back field by field on invalid URL values', () => {
    const params = nftListParamsSchema.parse({
      view: 'bogus',
      sort: 'cheapest',
      page: -3,
      minPrice: '1e2',
      collections: ['music', 'not-a-collection'],
      networks: ['solana'],
    })
    expect(params).toMatchObject({ view: 'all', sort: 'recent', page: 1, networks: ['solana'] })
    expect(params.minPrice).toBeUndefined()
    expect(params.collections).toBeUndefined()
  })

  it('accepts numeric values produced by URL JSON parsing', () => {
    const params = nftListParamsSchema.parse({ q: 2077, minPrice: 0.02, maxPrice: 12.3 })
    expect(params).toMatchObject({ q: '2077', minPrice: '0.02', maxPrice: '12.3' })
  })
})

describe('updateNftListParams', () => {
  const onPage3 = { ...defaultNftListParams, page: 3 }

  it('resets pagination when a filter changes', () => {
    expect(updateNftListParams(onPage3, { collections: ['music'] }).page).toBe(1)
    expect(updateNftListParams(onPage3, { sort: 'price-asc' }).page).toBe(1)
    expect(updateNftListParams(onPage3, { q: 'aurora' }).page).toBe(1)
  })

  it('keeps the requested page when only the page changes', () => {
    expect(updateNftListParams(onPage3, { page: 4 }).page).toBe(4)
  })
})

describe('isInvalidPriceRange', () => {
  it('flags min above max, comparing by value', () => {
    expect(isInvalidPriceRange({ ...defaultNftListParams, minPrice: '12.3', maxPrice: '2' })).toBe(
      true,
    )
    expect(isInvalidPriceRange({ ...defaultNftListParams, minPrice: '2', maxPrice: '12.3' })).toBe(
      false,
    )
    expect(isInvalidPriceRange({ ...defaultNftListParams, minPrice: '2' })).toBe(false)
  })
})
