import { createFileRoute, redirect } from '@tanstack/react-router'

import { authPromptHref } from '@/features/auth'

/**
 * Pathless layout guarding every private route (checkout, account, orders). Without a
 * session the user stays on the page they were on (home on a direct visit) with the
 * sign-in dialog open, carrying the full private URL, so the flow resumes exactly where it
 * stopped. Re-evaluated on router.invalidate() when a session expires.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.session.store.get()) {
      throw redirect({ href: authPromptHref(context.currentHref(), location.href) })
    }
  },
  // Private pages (checkout, account, orders) stay out of search engines
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
})
