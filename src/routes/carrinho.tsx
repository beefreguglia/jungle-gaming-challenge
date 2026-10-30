import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

// Cart table, coupon and summary land in the cart slice (Fase 5.4)
function CartPage() {
  return (
    <section className="mx-auto max-w-page px-4 py-16">
      <h1 className="text-heading font-bold">Carrinho de NFTs</h1>
    </section>
  )
}
