export interface KeyValueStorage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>()
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
    remove: (key) => void values.delete(key),
  }
}

/**
 * localStorage when available, memory otherwise (Node tests, private windows, quota errors).
 * A failed write keeps the in-memory state: the session still works, it just won't survive
 * a refresh.
 */
export function createStorage(area: 'local' | 'session' = 'local'): KeyValueStorage {
  const fallback = createMemoryStorage()
  const target = () => {
    try {
      return area === 'local' ? globalThis.localStorage : globalThis.sessionStorage
    } catch {
      return undefined
    }
  }

  return {
    get(key) {
      try {
        return target()?.getItem(key) ?? fallback.get(key)
      } catch {
        return fallback.get(key)
      }
    },
    set(key, value) {
      fallback.set(key, value)
      try {
        target()?.setItem(key, value)
      } catch {
        // Quota exceeded or storage blocked: keep the in-memory copy
      }
    },
    remove(key) {
      fallback.remove(key)
      try {
        target()?.removeItem(key)
      } catch {
        // Storage blocked
      }
    },
  }
}
