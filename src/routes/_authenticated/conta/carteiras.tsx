import { createFileRoute } from '@tanstack/react-router'

import { WalletsPage } from '@/features/account'

export const Route = createFileRoute('/_authenticated/conta/carteiras')({
  head: () => ({
    meta: [
      { title: 'Carteiras · Kurio' },
      {
        name: 'description',
        content: 'Cadastre e edite as carteiras principal e secundária usadas no pagamento.',
      },
    ],
  }),
  component: WalletsPage,
})
