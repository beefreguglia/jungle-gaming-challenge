import { redirect } from '@tanstack/react-router'
import { z } from 'zod'

import type { SessionManager } from '@/features/session'
import { safeRedirect } from '@/shared/lib/redirect'

export type AuthMode = 'sign-in' | 'sign-up'

export const AUTH_ROUTES = { 'sign-in': '/login', 'sign-up': '/cadastro' } as const

export const authSearchSchema = z.object({
  // Where to resume after signing in; validated again with safeRedirect before use
  redirect: z.string().optional().catch(undefined),
})

export type AuthSearch = z.infer<typeof authSearchSchema>

interface AuthBeforeLoad {
  context: { session: SessionManager }
  search: AuthSearch
}

/**
 * Auth pages are for visitors: a signed-in user (or one who just signed in, since the
 * router re-runs guards on every session change) continues to where they were going.
 */
export function leaveAuthPageWhenSignedIn({ context, search }: AuthBeforeLoad): void {
  if (context.session.store.get()) throw redirect({ href: safeRedirect(search.redirect) })
}
