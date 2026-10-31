import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { AuthDialog, authSearchSchema } from '@/features/auth'
import type { SessionManager } from '@/features/session'
import type { HttpClient } from '@/shared/api'

import { AppShell } from './-components/app-shell'

export interface RouterContext {
  queryClient: QueryClient
  http: HttpClient
  session: SessionManager
  // Address of the page on screen (undefined before the first one), for the auth guard
  currentHref: () => string | undefined
}

const RouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((m) => ({
        default: m.TanStackRouterDevtools,
      })),
    )
  : () => null

export const Route = createRootRouteWithContext<RouterContext>()({
  // `?auth=entrar|cadastro&redirect=` opens the sign-in dialog over any page
  validateSearch: authSearchSchema,
  // Defaults for every page; routes override title and description in their own `head`.
  // A URL that matches no route leaves only the root match (even "/" has its index route):
  // that page gets its own title
  head: ({ matches }) => ({
    meta: matches.every((match) => match.routeId === '__root__')
      ? [
          { title: 'Página não encontrada · Kurio' },
          { name: 'description', content: 'Este endereço não existe na Kurio.' },
        ]
      : [
          { title: 'Kurio · Marketplace de NFTs' },
          {
            name: 'description',
            content:
              'Marketplace de NFTs: descubra, colecione e compre edições digitais verificadas.',
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
      <AuthDialog />
      <Suspense>
        <RouterDevtools position="top-right" />
      </Suspense>
    </>
  )
}
