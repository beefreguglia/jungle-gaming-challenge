import { toast } from 'sonner'

import { mergeVisitorCart } from '@/features/cart'
import { forgetCheckout } from '@/features/checkout'
import type { SessionEndReason } from '@/features/session'

import type { createAppRouter } from './router'
import type { AppServices } from './services'

type AppRouter = ReturnType<typeof createAppRouter>

/**
 * Checkout drafts (typed data, wallet connection) are private. They survive an expiry, so
 * the same user resumes the purchase, and are dropped on logout or when someone else signs
 * in on this tab.
 */
function createDraftJanitor() {
  let expiredUserId: string | null = null
  return (previous: string | null, next: string | null, reason: SessionEndReason | null) => {
    if (previous && reason === 'expired' && next === null) {
      expiredUserId = previous
      return
    }
    if (previous) forgetCheckout(previous)
    if (next && expiredUserId && expiredUserId !== next) forgetCheckout(expiredUserId)
    if (next) expiredUserId = null
  }
}

/**
 * Reacts to every change of *who* is using the app (login, logout, expiry, other tab):
 * realtime reconnects with the new credentials, stale event ids are forgotten and route
 * guards re-run, which sends a user on a private page to /login with the page preserved.
 */
export function bindSessionLifecycle(
  { session, realtime, realtimeSync, http, queryClient, cartIds }: AppServices,
  router: AppRouter,
): () => void {
  let userId = session.store.get()?.user.id ?? null
  const forgetDrafts = createDraftJanitor()

  const unsubscribe = session.store.subscribe(() => {
    const { session: current, endedReason } = session.store.getSnapshot()
    const nextUserId = current?.user.id ?? null
    if (nextUserId === userId) return
    const previousUserId = userId
    const signedIn = userId === null && nextUserId !== null
    userId = nextUserId

    forgetDrafts(previousUserId, nextUserId, endedReason)

    // A visitor who signs in keeps what they put in the cart
    if (signedIn) void mergeVisitorCart({ http, queryClient, cartIds, userId: nextUserId })

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
