import { createFileRoute } from '@tanstack/react-router'

import { AuthPage, authSearchSchema, leaveAuthPageWhenSignedIn } from '@/features/auth'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  beforeLoad: leaveAuthPageWhenSignedIn,
  head: () => ({
    meta: [
      { title: 'Criar conta · Kurio' },
      {
        name: 'description',
        content: 'Crie seu perfil de colecionador na Kurio e comece a montar sua coleção de NFTs.',
      },
    ],
  }),
  component: SignUpPage,
})

function SignUpPage() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="sign-up" redirect={redirect} />
}
