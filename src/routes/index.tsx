import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { defaultNftListParams, nftListParamsSchema } from '@/domain/nft'

export const Route = createFileRoute('/')({
  // Catalog state lives in the URL: search, filters, sort and page survive refresh/history
  validateSearch: nftListParamsSchema,
  // Defaults stay out of the address bar ("/" instead of "/?view=all&sort=recent&page=1")
  search: { middlewares: [stripSearchParams(defaultNftListParams)] },
  component: HomePage,
})

// Hero, featured NFT and catalog land in the catalog slice (Fase 5.2)
function HomePage() {
  return (
    <section id="catalogo" className="mx-auto max-w-page px-4 py-16">
      <h1 className="text-heading font-bold">Catálogo</h1>
    </section>
  )
}
