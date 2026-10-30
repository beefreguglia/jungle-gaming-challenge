import { Link } from '@tanstack/react-router'
import type * as React from 'react'

import { isOnSale, isSoldOut, type Nft } from '@/domain/nft'
import { cn } from '@/shared/lib/utils'
import { NftImage } from '@/shared/ui/nft-image'
import { Price } from '@/shared/ui/price'

// Mobile card is ~175 px wide, desktop 258 px (art 250)
const IMAGE_SIZES = '(min-width: 1280px) 250px, (min-width: 768px) 30vw, 45vw'

interface NftCardProps {
  nft: Nft
  // First cards on screen load eagerly (they are part of the LCP)
  priority?: boolean
  // Overlay actions (favorite, add to cart) from later slices; kept outside the link
  actions?: React.ReactNode
  className?: string
}

/**
 * Catalog card from the Figma frames. The whole card is clickable through the name link,
 * stretched over it, so extra actions stay separate focusable controls.
 */
export function NftCard({ nft, priority = false, actions, className }: NftCardProps) {
  const soldOut = isSoldOut(nft)
  const [image] = nft.images

  return (
    <article className={cn('group relative flex flex-col gap-2 md:gap-3', className)}>
      <div className="relative rounded-[1.25rem] bg-linear-to-br from-card from-12% to-surface-raised px-1 pt-3 pb-5 md:rounded-sm md:bg-card md:bg-none md:py-6">
        {image && (
          <NftImage
            image={image}
            sizes={IMAGE_SIZES}
            priority={priority}
            className={cn(
              'w-full rounded-2xl transition-transform duration-300 group-hover:scale-[1.02] md:rounded-xl',
              soldOut && 'opacity-50 grayscale',
            )}
          />
        )}
        {nft.rarity === 'rare' && (
          <span className="absolute top-4 left-0 flex h-8 items-center bg-primary px-2 text-13 font-medium text-primary-foreground">
            RARO
          </span>
        )}
        {soldOut && (
          <span className="absolute inset-x-0 bottom-6 mx-auto w-fit rounded-sm bg-background/90 px-3 py-1 text-12 font-bold tracking-wider uppercase">
            Esgotado
          </span>
        )}
        {actions}
      </div>
      <div className="flex flex-col gap-1 pl-2 md:pl-0">
        <h3 className="text-15 font-normal">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0 after:rounded-[1.25rem] hover:text-accent-foreground focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring md:after:rounded-sm"
          >
            {nft.name}
          </Link>
        </h3>
        <Price
          value={nft.price}
          compareAt={isOnSale(nft) ? nft.compareAtPrice : undefined}
          className="text-16"
        />
      </div>
    </article>
  )
}
