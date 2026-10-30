import { toast } from 'sonner'

import type { createAppRouter } from './router'
import type { AppServices } from './services'

type AppRouter = ReturnType<typeof createAppRouter>

/**
 * Reacts to every change of *who* is using the app (login, logout, expiry, other tab):
 * realtime reconnects with the new credentials, stale event ids are forgotten and route
 * guards re-run, which sends a user on a private page to /login with the page preserved.
 */
export function bindSessionLifecycle(
  { session, realtime, realtimeSync }: AppServices,
  router: AppRouter,
): () => void {
  let userId = session.store.get()?.user.id ?? null

  const unsubscribe = session.store.subscribe(() => {
    const { session: current, endedReason } = session.store.getSnapshot()
    const nextUserId = current?.user.id ?? null
    if (nextUserId === userId) return
    userId = nextUserId

    realtimeSync.resetSession()
    realtime.reconnect()
    void router.invalidate()

    if (endedReason === 'expired') {
      toast.warning('Sua sessão expirou', {
        id: 'session-expired',
        description: 'Entre novamente para continuar de onde parou.',
      })
    }
  })

  session.start()
  realtime.connect()

  return () => {
    unsubscribe()
    session.dispose()
    realtime.disconnect()
    realtimeSync.dispose()
  }
}
