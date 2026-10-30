import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Toaster } from 'sonner'

import { SessionContext } from '@/features/session'
import { HttpClientContext, RealtimeClientContext } from '@/shared/api'
import { env } from '@/shared/config/env'

import { createAppRouter } from './router'
import { createAppServices } from './services'
import { bindSessionLifecycle } from './session-lifecycle'

const QueryDevtools = env.isDev
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
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
            <RouterProvider router={router} />
          </SessionContext>
        </RealtimeClientContext>
      </HttpClientContext>
      <Toaster position="bottom-right" />
      <Suspense>
        <QueryDevtools />
      </Suspense>
    </QueryClientProvider>
  )
}
