import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'

import { API_PATHS } from '@/domain/api-contract'
import { applyNftUpdate } from '@/domain/events'
import { type NftDetail, nftDetailSchema, nftSchema } from '@/domain/nft'
import type { HttpClient, RealtimeApplier } from '@/shared/api'

export const detailKeys = {
  detail: (id: string) => ['nfts', 'detail', id] as const,
  related: (id: string) => ['nfts', 'related', id] as const,
}

export function nftDetailQueryOptions(http: HttpClient, id: string) {
  return queryOptions({
    queryKey: detailKeys.detail(id),
    queryFn: ({ signal }) => http.get(API_PATHS.nft(id), { schema: nftDetailSchema, signal }),
    // A missing NFT (404) is final: the default policy only retries transient failures
    meta: { realtime: true },
  })
}

export function relatedNftsQueryOptions(http: HttpClient, id: string) {
  return queryOptions({
    queryKey: detailKeys.related(id),
    queryFn: ({ signal }) =>
      http.get(API_PATHS.relatedNfts(id), { schema: z.array(nftSchema), signal }),
    staleTime: 5 * 60_000,
  })
}

/** Keeps an open detail page in step with price and stock changes (`nft.updated`). */
export const nftDetailRealtimeApplier: RealtimeApplier = {
  event: 'nft.updated',
  apply(queryClient, event) {
    queryClient.setQueryData<NftDetail>(detailKeys.detail(event.resource.id), (nft) =>
      nft ? applyNftUpdate(nft, event) : nft,
    )
  },
}
