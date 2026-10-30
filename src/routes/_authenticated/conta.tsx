import { createFileRoute, Outlet } from '@tanstack/react-router'
import { LogOutIcon } from 'lucide-react'

import { useLogout } from '@/features/auth'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/_authenticated/conta')({
  component: AccountLayout,
})

// Becomes the "Meu perfil" sidebar layout (Perfil, Carteiras) in the account slice (Fase 5.5)
function AccountLayout() {
  const logout = useLogout()

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <h1 className="text-2xl font-bold">Minha conta</h1>
      {/* Moves into the account sidebar ("Sair") in Fase 5.5 */}
      <Button
        variant="outline"
        className="mt-6"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        <LogOutIcon />
        Sair
      </Button>
      <Outlet />
    </section>
  )
}
