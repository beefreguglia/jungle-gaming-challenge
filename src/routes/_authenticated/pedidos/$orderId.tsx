import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound, redirect } from '@tanstack/react-router'

import { OrderReceipt, OrderReceiptSkeleton, orderQueryOptions } from '@/features/checkout'
import { useSession } from '@/features/session'
import { isApiError, useHttpClient } from '@/shared/api'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/_authenticated/pedidos/$orderId')({
  loader: async ({ context: { queryClient, http, session }, params }) => {
    const userId = session.store.get()?.user.id ?? ''
    try {
      const order = await queryClient.fetchQuery(orderQueryOptions(http, userId, params.orderId))
      // The receipt exists only for a confirmed order; anything else is still being paid
      if (order.status !== 'confirmed') {
        throw redirect({ to: '/checkout', search: { pedido: order.id }, replace: true })
      }
      return { found: true }
    } catch (error) {
      if (isApiError(error) && error.kind === 'not_found') throw notFound()
      throw error
    }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: 'Pedido confirmado · Kurio' },
          { name: 'description', content: 'Recibo da sua compra de NFTs na Kurio.' },
        ]
      : [
          { title: 'Pedido não encontrado · Kurio' },
          { name: 'description', content: 'Este pedido não existe ou pertence a outra conta.' },
        ],
  }),
  pendingComponent: OrderReceiptSkeleton,
  pendingMs: 150,
  pendingMinMs: 300,
  notFoundComponent: OrderNotFound,
  component: OrderPage,
})

function OrderNotFound() {
  return (
    <section className="mx-auto flex max-w-page flex-col items-center gap-4 px-7 py-16 text-center">
      <h1 className="text-18 font-bold">Pedido não encontrado</h1>
      <p className="text-14 text-muted-foreground">
        Este pedido não existe ou pertence a outra conta.
      </p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}

function OrderPage() {
  const { orderId } = Route.useParams()
  const http = useHttpClient()
  const { session } = useSession()
  const { data: order } = useSuspenseQuery(orderQueryOptions(http, session?.user.id ?? '', orderId))
  return (
    <div className="px-4 py-8 md:py-14">
      <OrderReceipt order={order} />
    </div>
  )
}
