import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { useHttpClient } from '@/shared/api'
import { NftImage } from '@/shared/ui/nft-image'
import { Skeleton } from '@/shared/ui/skeleton'

import { featuredNftQueryOptions } from '../api/catalog-queries'

/**
 * "NFT EM DESTAQUE / OFERTA LIMITADA" banner under the desktop filters (310 × 448).
 * Secondary content: if it fails, the sidebar simply goes without it.
 */
export function FeaturedNft() {
  const http = useHttpClient()
  const { data: nft, isPending } = useQuery(featuredNftQueryOptions(http))

  if (isPending) return <Skeleton className="h-[28rem] w-full" />
  const image = nft?.images[0]
  if (!nft || !image) return null

  return (
    <article className="group relative flex flex-col gap-4 pt-6">
      <div className="flex flex-col gap-4 px-5">
        <p className="text-24 font-bold text-accent-foreground">NFT EM DESTAQUE</p>
        <h2 className="text-16 font-bold">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring"
          >
            OFERTA LIMITADA
            <span className="sr-only">: {nft.name}</span>
          </Link>
        </h2>
      </div>
      <NftImage
        image={image}
        sizes="310px"
        className="aspect-[310/368] w-full rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
      />
    </article>
  )
}
