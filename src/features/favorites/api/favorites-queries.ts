import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { API_PATHS } from '@/domain/api-contract'
import { type Favorites, favoritesSchema, isFavorite, toggleFavorite } from '@/domain/favorites'
import { useSession, userKey } from '@/features/session'
import { type HttpClient, useHttpClient } from '@/shared/api'

export const favoritesKey = (userId: string) => userKey(userId, 'favorites')

export function favoritesQueryOptions(http: HttpClient, userId: string) {
  return queryOptions({
    queryKey: favoritesKey(userId),
    queryFn: ({ signal }) => http.get(API_PATHS.favorites, { schema: favoritesSchema, signal }),
    staleTime: 5 * 60_000,
  })
}

/** The member's favorites; visitors have none (and no request is made). */
export function useFavorites() {
  const http = useHttpClient()
  const { session } = useSession()
  const userId = session?.user.id
  return useQuery({
    ...favoritesQueryOptions(http, userId ?? ''),
    enabled: userId !== undefined,
  })
}

export function useIsFavorite(nftId: string): boolean {
  return isFavorite(useFavorites().data, nftId)
}

/**
 * Optimistic toggle with rollback: the heart flips at once; if the API fails, the previous
 * state comes back and the user is told. The server's answer then replaces the guess.
 */
export function useToggleFavorite() {
  const http = useHttpClient()
  const queryClient = useQueryClient()
  const { session } = useSession()

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      favorite
        ? http.put<Favorites>(API_PATHS.favorite(nftId), undefined, { schema: favoritesSchema })
        : http.delete<Favorites>(API_PATHS.favorite(nftId), { schema: favoritesSchema }),

    onMutate: async ({ nftId }) => {
      if (!session) return undefined
      const key = favoritesKey(session.user.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, toggleFavorite(previous ?? { nftIds: [] }, nftId))
      return { key, previous }
    },

    onError: (_error, { favorite }, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      toast.error(
        favorite ? 'Não foi possível favoritar' : 'Não foi possível remover dos favoritos',
        {
          description: 'Nada mudou. Tente novamente em instantes.',
        },
      )
    },

    onSuccess: (favorites, _input, context) => {
      if (context) queryClient.setQueryData(context.key, favorites)
    },
  })
}
