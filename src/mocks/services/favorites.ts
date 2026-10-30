import type { Favorites } from '@/domain/favorites'

import type { Backend } from '../backend'
import type { UserRecord } from '../fixtures/users'
import { findNftRecord } from './catalog'

export function getFavorites(backend: Backend, user: UserRecord): Favorites {
  return { nftIds: [...(backend.db.state.favorites[user.id] ?? [])] }
}

/** PUT and DELETE are idempotent: repeating them leaves the same state. */
export function setFavorite(
  backend: Backend,
  user: UserRecord,
  change: { nftId: string; favorite: boolean },
): Favorites {
  findNftRecord(backend, change.nftId)
  const current = backend.db.state.favorites[user.id] ?? []
  const without = current.filter((id) => id !== change.nftId)
  backend.db.state.favorites[user.id] = change.favorite ? [...without, change.nftId] : without
  backend.db.commit()
  return getFavorites(backend, user)
}
