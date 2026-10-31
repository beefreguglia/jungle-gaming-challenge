import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AccountNav, LogoutButton } from '@/features/account'

export const Route = createFileRoute('/_authenticated/conta')({
  component: AccountLayout,
})

/**
 * Account area. Mobile first (no Figma frame): title with "Sair", section pills, content.
 * From md: the Figma "Meu perfil" sidebar (310 px) beside the section content.
 */
function AccountLayout() {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-6 pt-8 md:grid md:grid-cols-[minmax(0,19.375rem)_minmax(0,1fr)] md:gap-7 md:px-4 xl:px-0">
      <div className="flex items-center justify-between md:hidden">
        <h1 className="text-20 font-bold">Minha conta</h1>
        <LogoutButton className="text-15" />
      </div>
      <h1 className="hidden md:sr-only md:block">Minha conta</h1>
      <AccountNav />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
