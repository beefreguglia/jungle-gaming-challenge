import { createFileRoute } from '@tanstack/react-router'

import { ProfileForm, PasswordForm, useProfile } from '@/features/account'
import { isApiError } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/_authenticated/conta/perfil')({
  head: () => ({
    meta: [
      { title: 'Perfil do colecionador · Kurio' },
      { name: 'description', content: 'Edite seus dados, avatar e senha na Kurio.' },
    ],
  }),
  component: ProfilePage,
})

function ProfilePage() {
  const profile = useProfile()

  if (profile.isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando perfil"
        className="grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        {Array.from({ length: 6 }, (_, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- static placeholders
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }
  if (profile.isError) {
    // 403: retrying would not help, so it is said plainly and without the button
    const forbidden = isApiError(profile.error) && profile.error.kind === 'forbidden'
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>
          {forbidden
            ? 'Você não tem permissão para acessar este perfil.'
            : 'Não foi possível carregar seu perfil.'}
        </p>
        {!forbidden && <Button onClick={() => void profile.refetch()}>Tentar novamente</Button>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-12">
      {/* Not keyed by updatedAt: an avatar upload must not wipe unsaved typing */}
      <ProfileForm profile={profile.data} />
      <PasswordForm />
    </div>
  )
}
