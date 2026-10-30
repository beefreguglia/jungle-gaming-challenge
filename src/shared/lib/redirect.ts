/**
 * Accepts only same-app paths for post-login redirects ("/checkout?step=2"), never absolute
 * or protocol-relative URLs, so `?redirect=` cannot send users to another site.
 */
export function safeRedirect(target: unknown, fallback = '/'): string {
  if (typeof target !== 'string') return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) {
    return fallback
  }
  return target
}
