import { createFileRoute, redirect } from '@tanstack/react-router'

// "/conta" (tab bar, footer "Meu perfil") opens the first section
export const Route = createFileRoute('/_authenticated/conta/')({
  beforeLoad: () => {
    throw redirect({ to: '/conta/perfil', replace: true })
  },
})
