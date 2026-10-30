import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import type { SessionManager } from '@/features/session'
import type { HttpClient } from '@/shared/api'

import { AppShell } from './-components/app-shell'

export interface RouterContext {
  queryClient: QueryClient
  http: HttpClient
  session: SessionManager
}

const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      <Suspense>
        <RouterDevtools position="bottom-left" />
      </Suspense>
    </>
  )
}
