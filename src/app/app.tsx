import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { CartIdContext } from '@/features/cart'
import { SessionContext } from '@/features/session'
import { HttpClientContext, RealtimeClientContext } from '@/shared/api'
import { env } from '@/shared/config/env'
import { Toaster } from '@/shared/ui/sonner'
import { TooltipProvider } from '@/shared/ui/tooltip'

import { createAppRouter } from './router'
import { createAppServices } from './services'
import { bindSessionLifecycle } from './session-lifecycle'

const QueryDevtools = env.isDev
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null

// Demo control for the mock backend; its code is only fetched when mocks are enabled
const MockPanel = env.enableMocks
  ? lazy(() => import('./mock-panel').then((m) => ({ default: m.MockPanel })))
  : () => null

/**
 * Builds the app: services (HTTP, socket, session), router and their wiring. A factory, not
 * module code, so the bundle can download while MSW starts; it must run only after the
 * mock worker is ready, since services open the socket and validate the session at once.
 */
export function createApp() {
  const services = createAppServices()
  const router = createAppRouter({
    queryClient: services.queryClient,
    http: services.http,
    session: services.session,
  })
  bindSessionLifecycle(services, router)

  return function App() {
    return (
      <QueryClientProvider client={services.queryClient}>
        <HttpClientContext value={services.http}>
          <RealtimeClientContext value={services.realtime}>
            <SessionContext value={services.session}>
              <CartIdContext value={services.cartIds}>
                <TooltipProvider delayDuration={200}>
                  <RouterProvider router={router} />
                </TooltipProvider>
              </CartIdContext>
            </SessionContext>
          </RealtimeClientContext>
        </HttpClientContext>
        <Toaster position="top-center" />
        <Suspense>
          <MockPanel />
          <QueryDevtools />
        </Suspense>
      </QueryClientProvider>
    )
  }
}
