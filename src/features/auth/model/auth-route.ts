import { z } from 'zod'

export type AuthMode = 'sign-in' | 'sign-up'

// Value of `?auth=` that opens the dialog in each mode, on any page
export const AUTH_PARAM = { 'sign-in': 'entrar', 'sign-up': 'cadastro' } as const

export const authSearchSchema = z.object({
  auth: z.enum(['entrar', 'cadastro']).optional().catch(undefined),
  // Where to resume after signing in; validated again with safeRedirect before use
  redirect: z.string().optional().catch(undefined),
})

export type AuthSearch = z.infer<typeof authSearchSchema>

export function authModeOf(search: AuthSearch): AuthMode | null {
  if (search.auth === 'entrar') return 'sign-in'
  if (search.auth === 'cadastro') return 'sign-up'
  return null
}

// Only used to parse and rebuild app-relative URLs
const BASE = 'http://kurio.invalid'

/** The same app URL without the dialog's `auth` and `redirect` params. */
export function withoutAuthParams(href: string): string {
  const url = new URL(href, BASE)
  url.searchParams.delete('auth')
  url.searchParams.delete('redirect')
  return url.pathname + url.search + url.hash
}

/**
 * Where a visitor who opens a private page goes: the page they were on (home on a direct
 * visit, or when that page is the private one itself, e.g. its session just expired) with
 * the sign-in dialog open. Signing in then resumes the private page.
 */
export function authPromptHref(from: string | undefined, target: string): string {
  const targetUrl = new URL(target, BASE)
  // A target that is already a prompt (a private page bouncing again) keeps its resume point
  const resume = targetUrl.searchParams.get('redirect') ?? withoutAuthParams(target)
  const stay = from !== undefined && new URL(from, BASE).pathname !== targetUrl.pathname
  const url = new URL(stay ? withoutAuthParams(from) : '/', BASE)
  url.searchParams.set('auth', AUTH_PARAM['sign-in'])
  url.searchParams.set('redirect', resume)
  return url.pathname + url.search + url.hash
}
