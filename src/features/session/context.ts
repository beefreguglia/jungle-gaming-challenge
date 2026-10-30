import { createContext, use, useSyncExternalStore } from 'react'

import type { SessionManager } from './model/session-manager'
import type { SessionSnapshot } from './model/session-store'

// React 19: render `<SessionContext value={manager}>` directly as the provider
export const SessionContext = createContext<SessionManager | null>(null)

export function useSessionManager(): SessionManager {
  const manager = use(SessionContext)
  if (!manager) throw new Error('useSessionManager must be used inside <SessionContext>')
  return manager
}

/** Current session snapshot; re-renders on login, logout and expiry. */
export function useSession(): SessionSnapshot {
  const { store } = useSessionManager()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
