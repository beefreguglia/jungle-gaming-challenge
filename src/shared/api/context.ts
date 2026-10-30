import { createContext, use, useSyncExternalStore } from 'react'

import type { HttpClient } from './http-client'
import type { RealtimeClient, RealtimeStatus } from './realtime-client'

/**
 * Transport instances are created once by the app (composition root) and handed down
 * through context; features never construct their own clients.
 * React 19: render `<HttpClientContext value={http}>` directly as the provider.
 */
export const HttpClientContext = createContext<HttpClient | null>(null)
export const RealtimeClientContext = createContext<RealtimeClient | null>(null)

export function useHttpClient(): HttpClient {
  const client = use(HttpClientContext)
  if (!client) throw new Error('useHttpClient must be used inside <HttpClientContext>')
  return client
}

/** Connection status for UI feedback ("Reconectando…"); 'idle' when realtime is absent. */
export function useRealtimeStatus(): RealtimeStatus {
  const client = use(RealtimeClientContext)
  return useSyncExternalStore(
    (onChange) => client?.onStatus(onChange) ?? (() => {}),
    () => client?.status ?? 'idle',
    () => 'idle',
  )
}
