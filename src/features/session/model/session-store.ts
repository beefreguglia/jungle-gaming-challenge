import { type CurrentSession, type Session, sessionSchema } from '@/domain/auth'
import { createSafeStorage, type SafeStorage } from '@/shared/lib/storage'

const STORAGE_KEY = 'kurio:session'

export type SessionEndReason = 'expired' | 'logout'

export interface SessionSnapshot {
  session: Session | null
  // Why the last session ended; lets the UI explain an unexpected logout
  endedReason: SessionEndReason | null
}

export interface SessionStore {
  getSnapshot(): SessionSnapshot
  get(): Session | null
  set(session: Session): void
  // Refreshes user data and expiry from GET /session without touching the token
  update(current: CurrentSession): void
  clear(reason: SessionEndReason): void
  subscribe(listener: () => void): () => void
}

function read(storage: SafeStorage): Session | null {
  const raw = storage.get(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/**
 * Persisted session (token + user). Survives refresh; other tabs follow logins and logouts
 * through the `storage` event, so two tabs never act as different users.
 */
export function createSessionStore(storage: SafeStorage = createSafeStorage()): SessionStore {
  let snapshot: SessionSnapshot = { session: read(storage), endedReason: null }
  const listeners = new Set<() => void>()

  function publish(next: SessionSnapshot): void {
    snapshot = next
    for (const listener of listeners) listener()
  }

  function write(session: Session | null, endedReason: SessionEndReason | null): void {
    if (session) storage.set(STORAGE_KEY, JSON.stringify(session))
    else storage.remove(STORAGE_KEY)
    publish({ session, endedReason })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return
      const session = read(storage)
      // Another tab logged out: treat it as a logout here too
      publish({ session, endedReason: session ? null : 'logout' })
    })
  }

  return {
    getSnapshot: () => snapshot,
    get: () => snapshot.session,
    set: (session) => write(session, null),
    update(current) {
      if (snapshot.session) write({ ...snapshot.session, ...current }, null)
    },
    clear: (reason) => write(null, reason),
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}
