import { compareEth, type Eth } from '@/domain/money'
import {
  lowestEditionPrice,
  NFT_COLLECTIONS,
  NFT_NETWORKS,
  type Nft,
  type NftDetail,
  nftDetailSchema,
  type NftFacets,
  type NftListParams,
  type NftListResponse,
  nftSchema,
} from '@/domain/nft'
import { totalPages } from '@/domain/pagination'

import type { Backend } from '../backend'
import type { NftRecord } from '../fixtures/nfts'
import { fail } from '../lib/errors'

// Zod strips the mock-only flags (featured, trending, isNew) and detail-only fields
export const toNft = (record: NftRecord): Nft => nftSchema.parse(record)
export const toNftDetail = (record: NftRecord): NftDetail => nftDetailSchema.parse(record)

type Filter = (nft: NftRecord) => boolean

function matchesView(view: NftListParams['view']): Filter {
  if (view === 'featured') return (nft) => nft.featured
  if (view === 'new') return (nft) => nft.isNew
  if (view === 'trending') return (nft) => nft.trending
  return () => true
}

function matchesText(q: string | undefined): Filter {
  const term = q?.trim().toLowerCase()
  if (!term) return () => true
  return (nft) =>
    [nft.name, nft.series, nft.creator.name, nft.tokenId].some((field) =>
      field.toLowerCase().includes(term),
    )
}

function matchesPrice(min: Eth | undefined, max: Eth | undefined): Filter {
  return (nft) =>
    (min === undefined || compareEth(nft.price, min) >= 0) &&
    (max === undefined || compareEth(nft.price, max) <= 0)
}

const inList =
  <T>(values: readonly T[] | undefined, pick: (nft: NftRecord) => T): Filter =>
  (nft) =>
    !values?.length || values.includes(pick(nft))

const SORTERS: Record<NftListParams['sort'], (a: NftRecord, b: NftRecord) => number> = {
  recent: (a, b) => b.listedAt.localeCompare(a.listedAt),
  'price-asc': (a, b) => compareEth(a.price, b.price) || a.name.localeCompare(b.name),
  'price-desc': (a, b) => compareEth(b.price, a.price) || a.name.localeCompare(b.name),
}

function countBy<K extends string>(
  keys: readonly K[],
  items: NftRecord[],
  pick: (nft: NftRecord) => K,
) {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>
  for (const item of items) counts[pick(item)] += 1
  return counts
}

/**
 * Facet counts follow the usual rule: each facet is counted with every *other* filter
 * applied, so picking "Música" still shows how many items the other collections have.
 */
function facets(
  pool: NftRecord[],
  filters: Record<'text' | 'price' | 'collection' | 'network', Filter>,
): NftFacets {
  const except = (skip: keyof typeof filters) =>
    pool.filter((nft) =>
      Object.entries(filters).every(([key, filter]) => key === skip || filter(nft)),
    )

  const prices = pool.map((nft) => nft.price).toSorted(compareEth)
  return {
    collections: countBy(NFT_COLLECTIONS, except('collection'), (nft) => nft.collection),
    networks: countBy(NFT_NETWORKS, except('network'), (nft) => nft.network),
    priceRange: { min: prices[0] ?? '0', max: prices.at(-1) ?? '0' },
  }
}

export function queryCatalog(backend: Backend, params: NftListParams): NftListResponse {
  const pool = backend.scenario().emptyCatalog
    ? []
    : backend.db.state.nfts.filter(matchesView(params.view))

  const filters = {
    text: matchesText(params.q),
    price: matchesPrice(params.minPrice, params.maxPrice),
    collection: inList(params.collections, (nft) => nft.collection),
    network: inList(params.networks, (nft) => nft.network),
  }
  const matches = pool
    .filter((nft) => Object.values(filters).every((filter) => filter(nft)))
    .toSorted(SORTERS[params.sort])

  const start = (params.page - 1) * params.pageSize
  return {
    items: matches.slice(start, start + params.pageSize).map(toNft),
    page: params.page,
    pageSize: params.pageSize,
    total: matches.length,
    totalPages: totalPages(matches.length, params.pageSize),
    facets: facets(pool, filters),
  }
}

export function findNftRecord(backend: Backend, id: string): NftRecord {
  const nft = backend.db.state.nfts.find((item) => item.id === id)
  if (!nft) throw fail.notFound('NFT não encontrado')
  return nft
}

/** "Mais desta coleção": same series first, then same category, excluding the NFT itself. */
export function relatedNfts(backend: Backend, id: string, limit = 10): Nft[] {
  const nft = findNftRecord(backend, id)
  const others = backend.db.state.nfts.filter((item) => item.id !== id)
  const score = (item: NftRecord) =>
    (item.series === nft.series ? 2 : 0) + (item.collection === nft.collection ? 1 : 0)
  return others
    .filter((item) => score(item) > 0)
    .toSorted((a, b) => score(b) - score(a) || b.listedAt.localeCompare(a.listedAt))
    .slice(0, limit)
    .map(toNft)
}

/**
 * Changes an edition's price and/or stock: bumps the NFT version and publishes
 * `nft.updated`, so REST reads and realtime events always agree.
 */
export function updateEdition(
  backend: Backend,
  target: { nftId: string; editionId: string },
  patch: { price?: Eth; available?: number },
): NftRecord {
  const nft = findNftRecord(backend, target.nftId)
  const edition = nft.editions.find((item) => item.id === target.editionId)
  if (!edition) throw fail.notFound('Edição não encontrada')

  if (patch.price !== undefined) edition.price = patch.price
  if (patch.available !== undefined) {
    edition.available = Math.max(0, Math.min(patch.available, edition.supply))
  }
  nft.price = lowestEditionPrice(nft.editions)
  nft.version += 1

  backend.db.commit()
  backend.realtime.publishNft(nft)
  return nft
}
