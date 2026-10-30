/**
 * localStorage that never throws: private windows, blocked site data and quota errors fall
 * back to memory. Callers must treat a missing value as the normal case.
 */
export interface SafeStorage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export function createSafeStorage(area: 'local' | 'session' = 'local'): SafeStorage {
  const memory = new Map<string, string>()
  const target = (): Storage | undefined => {
    try {
      return area === 'local' ? globalThis.localStorage : globalThis.sessionStorage
    } catch {
      return undefined
    }
  }

  return {
    get(key) {
      try {
        return target()?.getItem(key) ?? memory.get(key) ?? null
      } catch {
        return memory.get(key) ?? null
      }
    },
    set(key, value) {
      memory.set(key, value)
      try {
        target()?.setItem(key, value)
      } catch {
        // Keep the in-memory copy
      }
    },
    remove(key) {
      memory.delete(key)
      try {
        target()?.removeItem(key)
      } catch {
        // Storage blocked
      }
    },
  }
}
