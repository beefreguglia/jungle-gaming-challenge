import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { CheckoutPage } from '@/features/checkout'

const checkoutSearchSchema = z.object({
  // Order created from this page: kept in the URL so a reload resumes it
  pedido: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/checkout')({
  validateSearch: checkoutSearchSchema,
  head: () => ({
    meta: [
      { title: 'Pagamento · Kurio' },
      {
        name: 'description',
        content: 'Escolha a carteira e a rede, revise o pedido e confirme a compra dos seus NFTs.',
      },
    ],
  }),
  component: CheckoutRoute,
})

function CheckoutRoute() {
  const { pedido } = Route.useSearch()
  return <CheckoutPage key={pedido ?? 'form'} orderId={pedido} />
}
