import { createFileRoute } from '@tanstack/react-router'

import { AuthPage, authSearchSchema, leaveAuthPageWhenSignedIn } from '@/features/auth'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  beforeLoad: leaveAuthPageWhenSignedIn,
  head: () => ({
    meta: [
      { title: 'Entrar · Kurio' },
      { name: 'description', content: 'Entre na Kurio para comprar NFTs e gerenciar sua coleção.' },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="sign-in" redirect={redirect} />
}
