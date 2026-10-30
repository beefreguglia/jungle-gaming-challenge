import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/conta')({
  component: AccountLayout,
})

// Becomes the "Meu perfil" sidebar layout (Perfil, Carteiras) in the account slice (Fase 5.5)
function AccountLayout() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <h1 className="text-2xl font-bold">Minha conta</h1>
      <Outlet />
    </section>
  )
}
