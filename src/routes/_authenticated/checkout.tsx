import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

// Collector form, wallet/network, review and order submission land in Fase 5.6
function CheckoutPage() {
  return (
    <section className="mx-auto max-w-page px-4 py-16">
      <h1 className="text-heading font-bold">Pagamento</h1>
    </section>
  )
}
