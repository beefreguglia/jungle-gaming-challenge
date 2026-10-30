import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { safeRedirect } from '@/shared/lib/redirect'

const loginSearchSchema = z.object({
  // Where to resume after signing in; validated again with safeRedirect before use
  redirect: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.session.store.get()) throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: LoginPage,
})

// Sign-in form lands in the auth slice (Fase 5.1)
function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Entrar</h1>
    </section>
  )
}
