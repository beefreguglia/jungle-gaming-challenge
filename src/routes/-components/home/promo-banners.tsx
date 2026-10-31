import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'

import type { NftListParams } from '@/domain/nft'
import { NftImage } from '@/shared/ui/nft-image'

// Figma "Promos": each banner opens the matching slice of the catalog
const PROMOS: {
  title: string
  text: string
  image: { url: string; alt: string }
  search: Partial<NftListParams>
}[] = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: { url: '/images/nfts/emerald.webp', alt: '' },
    search: { view: 'new' },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: { url: '/images/nfts/baron.webp', alt: '' },
    search: { collections: ['digital-art'] },
  },
]

/** Two 586 × 250 promo banners: art on the left, copy and "Explorar" on the right. */
export function PromoBanners() {
  return (
    <section aria-label="Promoções" className="grid gap-6 lg:grid-cols-2 lg:gap-7">
      {PROMOS.map((promo) => (
        <article
          key={promo.title}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-sm bg-card"
        >
          <NftImage
            image={promo.image}
            sizes="(min-width: 1024px) 290px, 50vw"
            decorative
            className="size-full max-h-[15.625rem] object-cover"
          />
          <div className="flex flex-col items-end justify-center gap-3 p-4 text-right md:p-8">
            <h2 className="text-15 leading-6 font-bold md:text-16">{promo.title}</h2>
            <p className="text-12 leading-5 text-subtle">{promo.text}</p>
            <Link
              to="/"
              search={promo.search}
              hash="catalogo"
              className="mt-1 flex h-10 w-[8.75rem] items-center justify-center gap-2 rounded-button bg-primary text-14 font-bold text-primary-foreground hover:bg-accent-foreground"
            >
              Explorar <ArrowRightIcon className="size-4" aria-hidden="true" />
              <span className="sr-only">: {promo.title}</span>
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}
