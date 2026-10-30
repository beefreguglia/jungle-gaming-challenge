import { z } from 'zod'

import { compareEth, ethSchema } from './money'
import { DEFAULT_PAGE_SIZE, paginatedSchema } from './pagination'

export const NFT_COLLECTIONS = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'memberships',
  'utility',
] as const

export const NFT_NETWORKS = ['ethereum', 'polygon', 'solana'] as const

// Catalog sections: "Todos os NFTs", "NFT em destaque", "Novos lançamentos", "Em alta"
export const NFT_VIEWS = ['all', 'featured', 'new', 'trending'] as const

export const NFT_SORTS = ['recent', 'price-asc', 'price-desc'] as const

export const nftCollectionSchema = z.enum(NFT_COLLECTIONS)
export const nftNetworkSchema = z.enum(NFT_NETWORKS)
export const nftViewSchema = z.enum(NFT_VIEWS)
export const nftSortSchema = z.enum(NFT_SORTS)

export type NftCollection = z.infer<typeof nftCollectionSchema>
export type NftNetwork = z.infer<typeof nftNetworkSchema>
export type NftView = z.infer<typeof nftViewSchema>
export type NftSort = z.infer<typeof nftSortSchema>

export const nftEditionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    price: ethSchema,
    supply: z.number().int().min(1),
    // Units still purchasable; also the quantity limit for this edition
    available: z.number().int().min(0),
  })
  .refine((edition) => edition.available <= edition.supply, {
    message: 'available cannot exceed supply',
    path: ['available'],
  })

export const nftImageSchema = z.object({
  url: z.string(),
  alt: z.string(),
})

export const nftCreatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().optional(),
})

export const nftSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  collection: nftCollectionSchema,
  network: nftNetworkSchema,
  creator: nftCreatorSchema,
  images: z.array(nftImageSchema).min(1),
  // Lowest price among editions with stock; the catalog card shows and sorts by it
  price: ethSchema,
  editions: z.array(nftEditionSchema).min(1),
  listedAt: z.iso.datetime(),
  // Bumped on every price/availability change; realtime events carry it too
  version: z.number().int().min(1),
})

export type NftEdition = z.infer<typeof nftEditionSchema>
export type NftImage = z.infer<typeof nftImageSchema>
export type NftCreator = z.infer<typeof nftCreatorSchema>
export type Nft = z.infer<typeof nftSchema>

export const nftPageSchema = paginatedSchema(nftSchema)

export function isEditionAvailable(edition: NftEdition): boolean {
  return edition.available > 0
}

export function isSoldOut(nft: Nft): boolean {
  return !nft.editions.some(isEditionAvailable)
}

export function findEdition(nft: Nft, editionId: string): NftEdition | undefined {
  return nft.editions.find((edition) => edition.id === editionId)
}

/** Clamps a requested quantity to what the edition can still sell (0 when sold out). */
export function clampQuantity(edition: NftEdition, requested: number): number {
  return Math.max(0, Math.min(Math.trunc(requested), edition.available))
}

/** Default edition for the detail page: the cheapest one with stock, else the first. */
export function defaultEdition(nft: Nft): NftEdition {
  const available = nft.editions.filter(isEditionAvailable)
  const cheapest = available.toSorted((a, b) => compareEth(a.price, b.price))[0]
  return cheapest ?? (nft.editions[0] as NftEdition)
}

// --- Catalog query -------------------------------------------------------------------------

/**
 * Catalog search params. Shared by the URL (router validateSearch), the query key and the
 * REST query string, so all three always agree. Invalid URL values fall back to defaults
 * instead of breaking the page.
 */
// The router JSON-parses search values, so a hand-typed `?minPrice=0.02` arrives as a number
const fromNumber = (value: unknown) => (typeof value === 'number' ? String(value) : value)

export const nftListParamsSchema = z.object({
  q: z.preprocess(fromNumber, z.string().trim().max(100).optional()).catch(undefined),
  view: nftViewSchema.default('all').catch('all'),
  collections: z.array(nftCollectionSchema).optional().catch(undefined),
  networks: z.array(nftNetworkSchema).optional().catch(undefined),
  minPrice: z.preprocess(fromNumber, ethSchema.optional()).catch(undefined),
  maxPrice: z.preprocess(fromNumber, ethSchema.optional()).catch(undefined),
  sort: nftSortSchema.default('recent').catch('recent'),
  page: z.number().int().min(1).default(1).catch(1),
  pageSize: z.number().int().min(1).max(48).default(DEFAULT_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
})

export type NftListParams = z.infer<typeof nftListParamsSchema>
export type NftListParamsInput = z.input<typeof nftListParamsSchema>

export const defaultNftListParams: NftListParams = nftListParamsSchema.parse({})

/**
 * Applies a filter/search/sort change. Any change other than the page itself resets
 * pagination, so a narrower filter never lands on an empty page.
 */
export function updateNftListParams(
  current: NftListParams,
  patch: Partial<NftListParams>,
): NftListParams {
  const onlyPageChanged = Object.keys(patch).every((key) => key === 'page')
  return nftListParamsSchema.parse({
    ...current,
    ...patch,
    page: onlyPageChanged ? (patch.page ?? current.page) : 1,
  })
}

/** True when min > max; the UI should flag the range instead of querying. */
export function isInvalidPriceRange({ minPrice, maxPrice }: NftListParams): boolean {
  return minPrice !== undefined && maxPrice !== undefined && compareEth(minPrice, maxPrice) > 0
}
