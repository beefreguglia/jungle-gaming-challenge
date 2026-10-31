import type { NftImage as NftImageData } from '@/domain/nft'
import { cn } from '@/shared/lib/utils'

// Artworks ship as square WebP in two widths: `<name>.webp` (960) and `<name>-480.webp`
const RESPONSIVE_ART = /^(\/images\/nfts\/[\w-]+)\.webp$/

function srcSetFor(url: string): string | undefined {
  const match = url.match(RESPONSIVE_ART)
  return match ? `${match[1]}-480.webp 480w, ${url} 960w` : undefined
}

/** Fetches an artwork ahead of time (e.g. the next carousel slide), so it shows at once. */
export function preloadNftImage(image: NftImageData, sizes: string): void {
  const img = new Image()
  img.sizes = sizes
  img.srcset = srcSetFor(image.url) ?? ''
  img.src = image.url
}

interface NftImageProps {
  image: NftImageData
  // Rendered width hint for the browser, e.g. "(min-width: 768px) 250px, 168px"
  sizes: string
  // Above-the-fold art (hero, first cards): fetched eagerly with high priority (LCP)
  priority?: boolean
  // Decorative copies (a second view of an artwork already described) pass an empty alt
  decorative?: boolean
  className?: string
}

/**
 * Square NFT artwork. Intrinsic size is always declared so the layout never shifts while
 * the file loads, and the placeholder color matches the card behind it.
 */
export function NftImage({
  image,
  sizes,
  priority = false,
  decorative = false,
  className,
}: NftImageProps) {
  return (
    <img
      src={image.url}
      srcSet={srcSetFor(image.url)}
      sizes={sizes}
      alt={decorative ? '' : image.alt}
      width={960}
      height={960}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('aspect-square bg-artwork object-cover', className)}
    />
  )
}
