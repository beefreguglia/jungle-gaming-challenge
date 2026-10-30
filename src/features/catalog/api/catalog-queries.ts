import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { API_PATHS } from '@/domain/api-contract'
import { applyNftUpdate } from '@/domain/events'
import { type NftListParams, type NftListResponse, nftListResponseSchema } from '@/domain/nft'
import type { HttpClient, RealtimeApplier } from '@/shared/api'

/**
 * Every list query lives under ['nfts', 'list', …], one key per parameter combination: an
 * answer for an older search can only fill its own key, never the current one, so
 * out-of-order responses are harmless. The detail slice adds ['nfts', 'detail', id].
 */
export const catalogKeys = {
  lists: () => ['nfts', 'list'] as const,
  list: (params: NftListParams) => ['nfts', 'list', params] as const,
  featured: () => ['nfts', 'list', 'featured'] as const,
}

function fetchNftList(http: HttpClient, params: Record<string, unknown>, signal?: AbortSignal) {
  return http.get(API_PATHS.nfts, { params, schema: nftListResponseSchema, signal })
}

export function nftListQueryOptions(http: HttpClient, params: NftListParams) {
  return queryOptions({
    queryKey: catalogKeys.list(params),
    // The signal cancels the request when the user moves on to another search
    queryFn: ({ signal }) => fetchNftList(http, params, signal),
    // Keeps the previous page on screen (dimmed) while the next one loads
    placeholderData: keepPreviousData,
    meta: { realtime: true },
  })
}

export function featuredNftQueryOptions(http: HttpClient) {
  return queryOptions({
    queryKey: catalogKeys.featured(),
    queryFn: ({ signal }) => fetchNftList(http, { view: 'featured', pageSize: 1 }, signal),
    select: (page) => page.items[0] ?? null,
    staleTime: 5 * 60_000,
    meta: { realtime: true },
  })
}

/** Applies `nft.updated` to every cached list page; stale versions are ignored by the rule. */
export const catalogRealtimeApplier: RealtimeApplier = {
  event: 'nft.updated',
  apply(queryClient, event) {
    queryClient.setQueriesData<NftListResponse>({ queryKey: catalogKeys.lists() }, (page) =>
      page ? { ...page, items: page.items.map((nft) => applyNftUpdate(nft, event)) } : page,
    )
  },
}
