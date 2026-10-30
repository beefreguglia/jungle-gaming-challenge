import { useQuery } from '@tanstack/react-query'

import { isInvalidPriceRange, type NftListParams } from '@/domain/nft'
import { useHttpClient } from '@/shared/api'

import { nftListQueryOptions } from './catalog-queries'

/** Catalog page for the URL params; skipped while the price range is impossible (min > max). */
export function useNftList(params: NftListParams) {
  const http = useHttpClient()
  const invalidRange = isInvalidPriceRange(params)
  const query = useQuery({ ...nftListQueryOptions(http, params), enabled: !invalidRange })
  return { ...query, invalidRange }
}
