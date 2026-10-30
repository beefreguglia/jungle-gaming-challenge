import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

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

const services = createAppServices()
const router = createAppRouter({
  queryClient: services.queryClient,
  http: services.http,
  session: services.session,
})
bindSessionLifecycle(services, router)

export function App() {
  return (
    <QueryClientProvider client={services.queryClient}>
      <HttpClientContext value={services.http}>
        <RealtimeClientContext value={services.realtime}>
          <SessionContext value={services.session}>
            <TooltipProvider delayDuration={200}>
              <RouterProvider router={router} />
            </TooltipProvider>
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
