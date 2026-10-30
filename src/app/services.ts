import { AUTH_HEADER, bearer } from '@/domain/api-contract'
import {
  createSessionApi,
  createSessionManager,
  createSessionStore,
  isSessionRejection,
  type SessionManager,
} from '@/features/session'
import {
  type ApiError,
  createHttpClient,
  createRealtimeClient,
  createRealtimeSync,
  type HttpErrorContext,
} from '@/shared/api'
import { env } from '@/shared/config/env'
import type { SafeStorage } from '@/shared/lib/storage'

import { createQueryClient } from './query-client'
import { REALTIME_APPLIERS } from './realtime-appliers'

/**
 * Composition root: every long-lived instance is created here, once, and wired together.
 * Features receive them through router context and React context, never by importing them.
 */
interface AppServicesConfig {
  apiUrl: string
  socketUrl?: string
  // Where the session persists; tests share one between instances to simulate a refresh
  storage?: SafeStorage
}

export function createAppServices(
  { apiUrl, socketUrl, storage }: AppServicesConfig = {
    apiUrl: env.apiUrl,
    socketUrl: env.socketUrl,
  },
) {
  const queryClient = createQueryClient()
  const sessionStore = createSessionStore(storage)

  // The HTTP client must report expired sessions to the manager that depends on it
  let session: SessionManager | undefined
  const onHttpError = (error: ApiError, context: HttpErrorContext) => {
    if (isSessionRejection(error, context)) session?.expire()
  }

  const http = createHttpClient({
    baseURL: apiUrl,
    headers: () => {
      const current = sessionStore.get()
      return { [AUTH_HEADER]: current ? bearer(current.token) : null }
    },
    onError: onHttpError,
  })

  session = createSessionManager({
    store: sessionStore,
    api: createSessionApi(http),
    queryClient,
  })

  const realtime = createRealtimeClient({
    url: socketUrl,
    getToken: () => sessionStore.get()?.token ?? null,
  })
  const realtimeSync = createRealtimeSync({
    client: realtime,
    queryClient,
    getUserId: () => sessionStore.get()?.user.id ?? null,
    appliers: REALTIME_APPLIERS,
  })

  return { queryClient, http, session, realtime, realtimeSync }
}

export type AppServices = ReturnType<typeof createAppServices>
