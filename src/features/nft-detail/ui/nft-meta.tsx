import { MailIcon, StarIcon } from 'lucide-react'
import { siX } from 'simple-icons'

import type { NftDetail } from '@/domain/nft'
import { cn } from '@/shared/lib/utils'
import { BrandIcon } from '@/shared/ui/brand-icon'

const ratingLabel = ({ average, count }: NftDetail['rating']) =>
  `Avaliação ${average.toFixed(1).replace('.', ',')} de 5, ${count} avaliações de colecionadores`

/** Mobile "Review" pill: ★ 4.8 (19). */
export function RatingPill({ rating }: { rating: NftDetail['rating'] }) {
  return (
    <p className="flex h-7 items-center gap-1 rounded-full border border-primary px-2.5 text-14 font-bold">
      <span className="sr-only">{ratingLabel(rating)}</span>
      <span aria-hidden="true" className="flex items-center gap-1">
        <StarIcon className="size-3.5 fill-primary text-primary" />
        {rating.average.toFixed(1)}
        <span className="font-normal text-subtle">({rating.count})</span>
      </span>
    </p>
  )
}

/** Desktop stars: ★★★★★ 19 avaliações de colecionadores. */
export function RatingStars({ rating }: { rating: NftDetail['rating'] }) {
  return (
    <p className="flex items-center gap-1 text-13">
      <span className="sr-only">{ratingLabel(rating)}</span>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          // oxlint-disable-next-line react/no-array-index-key -- fixed five stars
          key={index}
          aria-hidden="true"
          className={cn(
            'size-3.5 text-primary',
            index < Math.round(rating.average) && 'fill-primary',
          )}
        />
      ))}
      <span aria-hidden="true" className="ml-1">
        {rating.count} avaliações de colecionadores
      </span>
    </p>
  )
}

/** "ID do token / Coleção / Atributos" lines. */
export function TokenInfo({ nft, className }: { nft: NftDetail; className?: string }) {
  const rows = [
    ['ID do token', `#${nft.tokenId}`],
    ['Coleção', nft.series],
    ['Atributos', nft.attributes.join(', ')],
  ]
  return (
    <dl className={cn('flex flex-col gap-3 text-14 text-subtle', className)}>
      {rows.map(([term, value]) => (
        <div key={term} className="flex flex-wrap gap-x-1">
          <dt>{term}:</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** "Compartilhar este NFT:" with real share endpoints (they open in a new tab). */
export function ShareLinks({ nft }: { nft: NftDetail }) {
  const url = encodeURIComponent(typeof window === 'undefined' ? '' : window.location.href)
  const text = encodeURIComponent(`${nft.name} na Kurio`)
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      icon: <span className="text-14 font-bold">in</span>,
    },
    {
      label: 'e-mail',
      href: `mailto:?subject=${text}&body=${url}`,
      icon: <MailIcon className="size-4" />,
    },
    {
      label: 'X (Twitter)',
      href: `https://x.com/intent/post?url=${url}&text=${text}`,
      icon: <BrandIcon icon={siX} className="size-3.5" />,
    },
  ]
  return (
    <div className="flex items-center gap-3 text-14">
      <span className="font-bold">Compartilhar este NFT:</span>
      <ul className="flex items-center gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target={link.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noopener noreferrer"
              className="grid size-7 place-items-center rounded-sm hover:text-accent-foreground"
            >
              <span aria-hidden="true">{link.icon}</span>
              <span className="sr-only">
                Compartilhar por {link.label}
                {link.href.startsWith('mailto:') ? '' : ' (abre em nova aba)'}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
