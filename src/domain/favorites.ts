import { z } from 'zod'

// The client needs membership checks (heart state) far more than full NFT data
export const favoritesSchema = z.object({
  nftIds: z.array(z.string()),
})

export type Favorites = z.infer<typeof favoritesSchema>

export function isFavorite(favorites: Favorites | undefined, nftId: string): boolean {
  return favorites?.nftIds.includes(nftId) ?? false
}

/** Pure toggle used for the optimistic update; the server response replaces it afterwards. */
export function toggleFavorite(favorites: Favorites, nftId: string): Favorites {
  return isFavorite(favorites, nftId)
    ? { nftIds: favorites.nftIds.filter((id) => id !== nftId) }
    : { nftIds: [...favorites.nftIds, nftId] }
}
