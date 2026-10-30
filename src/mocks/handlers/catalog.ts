import { HttpResponse } from 'msw'

import { API_PATHS } from '@/domain/api-contract'
import { nftListParamsSchema } from '@/domain/nft'

import { pattern, type RouteFn } from '../lib/route'
import { findNftRecord, queryCatalog, relatedNfts, toNftDetail } from '../services/catalog'
import { getFavorites, setFavorite } from '../services/favorites'
import { requireUser } from '../services/session'

const LIST_KEYS = new Set(['collections', 'networks'])
const NUMBER_KEYS = new Set(['page', 'pageSize'])

/**
 * Query string contract: arrays as repeated keys (`collections=music&collections=gaming`),
 * numbers as plain digits. Invalid values fall back to defaults, like the URL does.
 */
function readListParams(url: URL) {
  const raw: Record<string, unknown> = {}
  for (const key of new Set(url.searchParams.keys())) {
    if (LIST_KEYS.has(key)) raw[key] = url.searchParams.getAll(key)
    else if (NUMBER_KEYS.has(key)) raw[key] = Number(url.searchParams.get(key))
    else raw[key] = url.searchParams.get(key)
  }
  return nftListParamsSchema.parse(raw)
}

export const catalogHandlers = (route: RouteFn) => [
  route('get', API_PATHS.nfts, ({ backend, request }) =>
    HttpResponse.json(queryCatalog(backend, readListParams(new URL(request.url)))),
  ),

  route('get', pattern(API_PATHS.nft, 'id'), ({ backend, params }) =>
    HttpResponse.json(toNftDetail(findNftRecord(backend, params.id as string))),
  ),

  route('get', pattern(API_PATHS.relatedNfts, 'id'), ({ backend, params }) =>
    HttpResponse.json(relatedNfts(backend, params.id as string)),
  ),

  route('get', API_PATHS.favorites, ({ backend, authorization }) =>
    HttpResponse.json(getFavorites(backend, requireUser(backend, authorization))),
  ),

  route('put', pattern(API_PATHS.favorite, 'nftId'), ({ backend, authorization, params }) => {
    const user = requireUser(backend, authorization)
    return HttpResponse.json(
      setFavorite(backend, user, { nftId: params.nftId as string, favorite: true }),
    )
  }),

  route('delete', pattern(API_PATHS.favorite, 'nftId'), ({ backend, authorization, params }) => {
    const user = requireUser(backend, authorization)
    return HttpResponse.json(
      setFavorite(backend, user, { nftId: params.nftId as string, favorite: false }),
    )
  }),
]
