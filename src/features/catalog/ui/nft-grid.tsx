import type { Nft } from '@/domain/nft'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui/skeleton'

import { NftCard } from './nft-card'

/*
 * Mobile: two columns with the right one dropped 32 px (staggered, as in the frame).
 * md: three columns; lg: the filter sidebar takes space, back to two; xl: three of 258 px.
 */
const gridClass =
  'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 [&>li:nth-child(even)]:translate-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-12 md:pb-0 md:[&>li:nth-child(even)]:translate-y-0 lg:grid-cols-2 xl:grid-cols-3 xl:gap-x-[2.125rem] xl:gap-y-[4.5rem]'

// Cards visible without scrolling on the first paint; they load eagerly for LCP
const EAGER_CARDS = 3

export function NftGrid({ items, className }: { items: Nft[]; className?: string }) {
  return (
    <ul aria-label="Resultados" className={cn(gridClass, className)}>
      {items.map((nft, index) => (
        <li key={nft.id}>
          <NftCard nft={nft} priority={index < EAGER_CARDS} />
        </li>
      ))}
    </ul>
  )
}

/** Same geometry as the real cards, so nothing shifts when results arrive. */
export function NftGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={gridClass} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- static placeholders
        <li key={index} className="flex flex-col gap-2 md:gap-3">
          <div className="rounded-[1.25rem] bg-card px-1 pt-3 pb-5 md:rounded-sm md:py-6">
            <Skeleton className="aspect-square w-full rounded-2xl md:rounded-xl" />
          </div>
          <div className="flex flex-col gap-2 pl-2 md:pl-0">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}
