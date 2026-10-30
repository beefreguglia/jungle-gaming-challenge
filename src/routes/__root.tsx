import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router'
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
  // Defaults for every page; routes override title and description in their own `head`
  head: () => ({
    meta: [
      { title: 'Kurio · Marketplace de NFTs' },
      {
        name: 'description',
        content: 'Marketplace de NFTs: descubra, colecione e compre edições digitais verificadas.',
      },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <HeadContent />
      <AppShell>
        <Outlet />
      </AppShell>
      <Suspense>
        <RouterDevtools position="top-right" />
      </Suspense>
    </>
  )
}
