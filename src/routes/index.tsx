import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <h1 className="font-heading text-3xl font-semibold">NFT Marketplace</h1>
    </section>
  )
}
