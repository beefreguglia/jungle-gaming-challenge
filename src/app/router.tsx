import { createRouter } from '@tanstack/react-router'

import { RouteError } from '@/routes/-components/route-error'
import { RouteNotFound } from '@/routes/-components/route-not-found'
import type { RouterContext } from '@/routes/__root'
import { routeTree } from '@/routeTree.gen'

export function createAppRouter(context: Omit<RouterContext, 'currentHref'>) {
  const router = createRouter({
    routeTree,
    context: { ...context, currentHref: () => router.state.resolvedLocation?.href },
    // Loaders delegate caching to TanStack Query, so the router never serves stale preloads
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultNotFoundComponent: RouteNotFound,
    defaultErrorComponent: RouteError,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
