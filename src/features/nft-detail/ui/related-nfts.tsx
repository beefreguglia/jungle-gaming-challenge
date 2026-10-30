import { useQuery } from '@tanstack/react-query'

import { NftCard } from '@/features/catalog'
import { useHttpClient } from '@/shared/api'
import { Carousel } from '@/shared/ui/carousel'
import { Skeleton } from '@/shared/ui/skeleton'

import { relatedNftsQueryOptions } from '../api/detail-queries'

/** "Mais desta coleção": same series first. Secondary content, hidden if it fails. */
export function RelatedNfts({ nftId }: { nftId: string }) {
  const http = useHttpClient()
  const { data, isPending } = useQuery(relatedNftsQueryOptions(http, nftId))

  if (!isPending && (!data || data.length === 0)) return null

  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-6">
      <h2
        id="related-heading"
        className="border-b border-border pb-2 text-15 font-bold text-accent-foreground md:text-16"
      >
        Mais desta coleção
      </h2>
      {isPending || !data ? (
        <div className="flex gap-4 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- static placeholders
            <Skeleton
              key={index}
              className="aspect-[3/4] shrink-0 basis-[45%] md:basis-[30%] lg:basis-[18%]"
            />
          ))}
        </div>
      ) : (
        <Carousel label="Mais desta coleção">
          {data.map((nft) => (
            <NftCard key={nft.id} nft={nft} />
          ))}
        </Carousel>
      )}
    </section>
  )
}
