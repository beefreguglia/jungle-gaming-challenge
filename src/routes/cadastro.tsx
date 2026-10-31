import { createFileRoute, redirect } from '@tanstack/react-router'

import { AUTH_PARAM, authSearchSchema } from '@/features/auth'

// Direct access to the sign-up "screen": it is a dialog, opened over the home page
export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/', search: { auth: AUTH_PARAM['sign-up'], redirect: search.redirect } })
  },
})
