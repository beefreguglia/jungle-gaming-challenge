import { createSafeStorage, type SafeStorage } from '@/shared/lib/storage'

const STORAGE_KEY = 'kurio:cart-id'

/**
 * Id of the visitor's cart on the API (members' carts are found by their session). Kept
 * in localStorage so the visitor cart survives refresh; sent as `X-Cart-Id`.
 */
export interface CartIdStore {
  get(): string | null
  set(id: string): void
  clear(): void
  subscribe(listener: () => void): () => void
}

export function createCartIdStore(storage: SafeStorage = createSafeStorage()): CartIdStore {
  let current = storage.get(STORAGE_KEY)
  const listeners = new Set<() => void>()

  function publish(next: string | null): void {
    if (next === current) return
    current = next
    if (next) storage.set(STORAGE_KEY, next)
    else storage.remove(STORAGE_KEY)
    for (const listener of listeners) listener()
  }

  return {
    get: () => current,
    set: (id) => publish(id),
    clear: () => publish(null),
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
