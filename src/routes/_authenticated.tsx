import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Pathless layout guarding every private route (checkout, account, orders). Without a
 * session the user goes to /login carrying the full current URL, so the flow resumes
 * exactly where it stopped. Re-evaluated on router.invalidate() when a session expires.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.session.store.get()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
})
