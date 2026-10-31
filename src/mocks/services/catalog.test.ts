import { describe, expect, it } from 'vitest'

import { nftListParamsSchema, nftListResponseSchema } from '@/domain/nft'
import { DEFAULT_PAGE_SIZE } from '@/domain/pagination'

import { createTestBackend } from '../testing'
import { findNftRecord, queryCatalog, relatedNfts, updateEdition } from './catalog'

const params = (input: object = {}) => nftListParamsSchema.parse(input)

describe('fixtures', () => {
  it('have unique ids and satisfy the public contract', () => {
    const { backend } = createTestBackend()
    const ids = backend.db.state.nfts.map((nft) => nft.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThanOrEqual(48)
    expect(nftListResponseSchema.safeParse(queryCatalog(backend, params())).success).toBe(true)
  })

  it('keep the Figma prices', () => {
    const { backend } = createTestBackend()
    expect(findNftRecord(backend, 'emerald-ape-042').price).toBe('1.19')
    expect(findNftRecord(backend, 'neon-vessel-552')).toMatchObject({
      price: '1.99',
      compareAtPrice: '2.29',
    })
  })
})

describe('queryCatalog', () => {
  it('paginates', () => {
    const { backend } = createTestBackend()
    const page2 = queryCatalog(backend, params({ page: 2 }))
    expect(page2.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(page2.page).toBe(2)
    expect(page2.totalPages).toBe(Math.ceil(page2.total / DEFAULT_PAGE_SIZE))
  })

  it('combines filters', () => {
    const { backend } = createTestBackend()
    const result = queryCatalog(
      backend,
      params({ collections: ['music'], networks: ['ethereum'], maxPrice: '5' }),
    )
    expect(result.total).toBeGreaterThan(0)
    for (const nft of result.items) {
      expect(nft.collection).toBe('music')
      expect(nft.network).toBe('ethereum')
      expect(Number(nft.price)).toBeLessThanOrEqual(5)
    }
  })

  it('searches by name, series and token id', () => {
    const { backend } = createTestBackend()
    expect(queryCatalog(backend, params({ q: 'emerald ape' })).items[0]?.id).toBe('emerald-ape-042')
    expect(queryCatalog(backend, params({ q: 'golden frequencies' })).total).toBeGreaterThan(1)
  })

  it('sorts by price by value', () => {
    const { backend } = createTestBackend()
    const prices = queryCatalog(backend, params({ sort: 'price-asc', pageSize: 48 })).items.map(
      (nft) => Number(nft.price),
    )
    expect(prices).toEqual(prices.toSorted((a, b) => a - b))
  })

  it('counts each facet with the other filters applied', () => {
    const { backend } = createTestBackend()
    const all = queryCatalog(backend, params())
    const music = queryCatalog(backend, params({ collections: ['music'] }))
    // Choosing a collection does not shrink the collection counts themselves
    expect(music.facets.collections).toEqual(all.facets.collections)
    expect(music.facets.networks.ethereum).toBeLessThan(all.facets.networks.ethereum)
  })

  it('strips mock-only flags from responses', () => {
    const { backend } = createTestBackend()
    expect(queryCatalog(backend, params()).items[0]).not.toHaveProperty('featured')
  })

  it('returns nothing in the empty scenario', () => {
    const { backend } = createTestBackend({ emptyCatalog: true })
    expect(queryCatalog(backend, params())).toMatchObject({ items: [], total: 0, totalPages: 0 })
  })
})

describe('relatedNfts', () => {
  it('excludes the NFT itself and favors the same category', () => {
    const { backend } = createTestBackend()
    const related = relatedNfts(backend, 'emerald-ape-042')
    expect(related.map((nft) => nft.id)).not.toContain('emerald-ape-042')
    expect(related[0]?.collection).toBe('digital-art')
  })
})

describe('updateEdition', () => {
  it('bumps the version, recomputes the price and publishes the change', () => {
    const { backend, realtime } = createTestBackend()
    const target = { nftId: 'golden-signal-160', editionId: 'golden-signal-160-1of50' }
    const before = findNftRecord(backend, target.nftId)
    const version = before.version

    updateEdition(backend, target, { price: '0.1' })

    expect(before.version).toBe(version + 1)
    expect(before.price).toBe('0.1')
    expect(realtime.publishNft).toHaveBeenCalledWith(before)
  })
})
