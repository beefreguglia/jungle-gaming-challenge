import type { QueryClient } from '@tanstack/react-query'

import type { Session, SignInInput, SignUpInput } from '@/domain/auth'
import { isApiError } from '@/shared/api'

import { PRIVATE_SCOPES } from '../api/query-scope'
import type { SessionApi } from '../api/session-api'
import { isSessionRejection } from './session-rejection'
import type { SessionStore } from './session-store'

// setTimeout overflows above ~24.8 days
const MAX_TIMER_MS = 2 ** 31 - 1

type Schedule = (callback: () => void, delayMs: number) => () => void

const defaultSchedule: Schedule = (callback, delayMs) => {
  const id = setTimeout(callback, delayMs)
  return () => clearTimeout(id)
}

interface SessionManagerOptions {
  store: SessionStore
  api: SessionApi
  queryClient: QueryClient
  now?: () => number
  schedule?: Schedule
}

export interface SessionManager {
  readonly store: SessionStore
  signIn(input: SignInInput): Promise<Session>
  signUp(input: SignUpInput): Promise<Session>
  // Confirms the stored session with the API (boot, expiry time); 401 ends it
  validate(): Promise<void>
  // The API rejected our token: drop the session and its private data
  expire(): void
  logout(): Promise<void>
  start(): void
  dispose(): void
}

/**
 * Owns the session lifecycle. Every transition that changes *who* is using the app
 * purges private cached data first, so nothing from the previous user survives it.
 */
export function createSessionManager({
  store,
  api,
  queryClient,
  now = Date.now,
  schedule = defaultSchedule,
}: SessionManagerOptions): SessionManager {
  let cancelCheck = () => {}

  function purgePrivateData(): void {
    for (const scope of PRIVATE_SCOPES) {
      void queryClient.cancelQueries({ queryKey: [scope] })
      queryClient.removeQueries({ queryKey: [scope] })
    }
    queryClient.getMutationCache().clear()
  }

  function scheduleCheck(session: Session | null): void {
    cancelCheck()
    if (!session) return
    const delay = Math.min(Math.max(0, Date.parse(session.expiresAt) - now()), MAX_TIMER_MS)
    cancelCheck = schedule(() => void manager.validate(), delay)
  }

  function begin(session: Session): Session {
    if (store.get()?.user.id !== session.user.id) purgePrivateData()
    store.set(session)
    scheduleCheck(session)
    return session
  }

  const manager: SessionManager = {
    store,
    signIn: async (input) => begin(await api.signIn(input)),
    signUp: async (input) => begin(await api.signUp(input)),

    async validate() {
      const session = store.get()
      if (!session) return
      try {
        const current = await api.current()
        // A login/logout may have happened while the request was in flight
        if (store.get()?.token !== session.token) return
        store.update(current)
        scheduleCheck(store.get())
      } catch (error) {
        // Network trouble keeps the session; only the API rejecting the token ends it
        if (isApiError(error) && isSessionRejection(error, { sentAuthorization: true })) {
          manager.expire()
        }
      }
    },

    expire() {
      if (!store.get()) return
      cancelCheck()
      purgePrivateData()
      store.clear('expired')
    },

    async logout() {
      const session = store.get()
      if (!session) return
      cancelCheck()
      purgePrivateData()
      store.clear('logout')
      // Best effort: the local session is already gone even if the API is unreachable
      await api.signOut(session.token).catch(() => {})
    },

    start() {
      scheduleCheck(store.get())
      void manager.validate()
    },

    dispose: () => cancelCheck(),
  }
  return manager
}
