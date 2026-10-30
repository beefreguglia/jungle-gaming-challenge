import type { NftListParams } from '@/domain/nft'

export type CatalogChange = (patch: Partial<NftListParams>) => void

export function hasActiveFilters({ q, collections, networks, minPrice, maxPrice }: NftListParams) {
  return Boolean(q || collections?.length || networks?.length || minPrice || maxPrice)
}

// Resets search and filters; the section (tab) and sort are kept
export const CLEARED_FILTERS: Partial<NftListParams> = {
  q: undefined,
  collections: undefined,
  networks: undefined,
  minPrice: undefined,
  maxPrice: undefined,
}

/** Adds or removes a value from a multi-select filter; an empty list means "no filter". */
export function toggleValue<T>(list: readonly T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value)
    ? list.filter((item) => item !== value)
    : [...(list ?? []), value]
  return next.length > 0 ? next : undefined
}
