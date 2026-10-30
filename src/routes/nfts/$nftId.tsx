import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nfts/$nftId')({
  component: NftDetailPage,
})

// Gallery, editions, quantity and favorite land in the detail slice (Fase 5.3)
function NftDetailPage() {
  const { nftId } = Route.useParams()
  return (
    <section className="mx-auto max-w-page px-4 py-16">
      <h1 className="text-heading font-bold">{nftId}</h1>
    </section>
  )
}
