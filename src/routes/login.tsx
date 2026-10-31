import { createFileRoute, redirect } from '@tanstack/react-router'

import { AUTH_PARAM, authSearchSchema } from '@/features/auth'

// Direct access to the sign-in "screen": it is a dialog, opened over the home page
export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: AUTH_PARAM['sign-in'], redirect: search.redirect } })
  },
})
