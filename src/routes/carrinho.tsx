import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { defaultNftListParams } from '@/domain/nft'
import { CartPage } from '@/features/cart'
import { NftCard, nftListQueryOptions } from '@/features/catalog'
import { useHttpClient } from '@/shared/api'
import { Carousel } from '@/shared/ui/carousel'

const TRENDING = { ...defaultNftListParams, view: 'trending' as const, pageSize: 10 }

export const Route = createFileRoute('/carrinho')({
  loader: ({ context: { queryClient, http } }) => {
    void queryClient.prefetchQuery(nftListQueryOptions(http, TRENDING))
  },
  head: () => ({
    meta: [
      { title: 'Carrinho · Kurio' },
      {
        name: 'description',
        content: 'Revise os NFTs do seu carrinho, aplique um cupom e finalize.',
      },
    ],
  }),
  component: CartRoute,
})

/** "Colecionadores também viram": trending NFTs under the cart. Hidden if unavailable. */
function AlsoViewed() {
  const http = useHttpClient()
  const { data } = useQuery(nftListQueryOptions(http, TRENDING))
  if (!data || data.items.length === 0) return null
  return (
    <section aria-labelledby="also-viewed-heading" className="mt-10 flex flex-col gap-6 md:mt-20">
      <h2
        id="also-viewed-heading"
        className="border-b border-border pb-2 text-15 font-bold text-accent-foreground md:text-16"
      >
        Colecionadores também viram
      </h2>
      <Carousel label="Colecionadores também viram">
        {data.items.map((nft) => (
          <NftCard key={nft.id} nft={nft} />
        ))}
      </Carousel>
    </section>
  )
}

function CartRoute() {
  return <CartPage related={<AlsoViewed />} />
}
