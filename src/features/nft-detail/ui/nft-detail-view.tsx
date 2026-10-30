import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { clampQuantity, defaultEdition, findEdition, type NftDetail } from '@/domain/nft'
import { Price } from '@/shared/ui/price'

import { BuyActions } from './buy-actions'
import { DetailTabs } from './detail-tabs'
import { EditionChips } from './edition-chips'
import { DesktopGallery, MobileGallery } from './nft-gallery'
import { RatingPill, RatingStars, ShareLinks, TokenInfo } from './nft-meta'
import { RelatedNfts } from './related-nfts'

interface NftDetailViewProps {
  nft: NftDetail
  // Edition from the URL (?edicao=); invalid or missing falls back to the cheapest in stock
  editionId: string | undefined
  onEditionChange: (editionId: string) => void
}

function Breadcrumb() {
  return (
    <nav aria-label="Trilha de navegação" className="hidden text-14 font-bold md:block">
      <ol className="flex gap-1">
        <li>
          <Link to="/" className="hover:text-accent-foreground">
            Início
          </Link>
          <span aria-hidden="true"> /</span>
        </li>
        <li>
          <Link to="/" hash="catalogo" className="hover:text-accent-foreground">
            Mercado
          </Link>
        </li>
      </ol>
    </nav>
  )
}

/**
 * Mobile first: full-bleed hero, then the details sheet sliding over it (Figma "Details
 * Sheet"), buy bar fixed at the bottom. From md the desktop gallery and actions; from lg
 * gallery and details side by side (on tablet the details go below the gallery).
 */
export function NftDetailView({ nft, editionId, onEditionChange }: NftDetailViewProps) {
  // The default is chosen once, on arrival: if stock changes while the page is open, the
  // edition the user is looking at must not silently switch to another one
  const [initialEditionId] = useState(() => defaultEdition(nft).id)
  const edition =
    (editionId && findEdition(nft, editionId)) ||
    findEdition(nft, initialEditionId) ||
    defaultEdition(nft)
  const [image, setImage] = useState(0)
  const [requested, setRequested] = useState(1)
  // Stock can drop while the page is open (Socket.IO): never ask for more than exists
  const quantity = Math.max(1, clampQuantity(edition, requested))

  function changeEdition(id: string) {
    setRequested(1)
    onEditionChange(id)
  }

  return (
    <article className="flex flex-col">
      <MobileGallery nft={nft} active={image} onSelect={setImage} />
      <div className="relative -mt-28 flex flex-col gap-12 rounded-t-3xl bg-card px-6 pt-8 pb-10 md:mx-auto md:mt-0 md:w-full md:max-w-page md:gap-24 md:rounded-none md:bg-transparent md:px-4 md:pt-8 xl:px-0">
        <div className="flex flex-col gap-3 md:gap-7">
          <Breadcrumb />
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,35.8rem)_minmax(0,1fr)]">
            <DesktopGallery nft={nft} active={image} onSelect={setImage} />
            <div className="flex flex-col gap-4 md:gap-5">
              <div className="flex items-start justify-between gap-3 md:flex-col md:gap-3 md:border-b md:border-border md:pb-3">
                <h1 className="text-18 font-bold md:text-24">{nft.name}</h1>
                <div className="md:hidden">
                  <RatingPill rating={nft.rating} />
                </div>
                <div className="hidden w-full items-center justify-between md:flex">
                  <Price value={edition.price} className="text-20" />
                  <RatingStars rating={nft.rating} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="hidden text-15 font-bold md:block">Sobre este NFT:</h2>
                <p className="text-14 leading-6 text-subtle md:text-13">{nft.description}</p>
              </div>
              <EditionChips editions={nft.editions} value={edition.id} onChange={changeEdition} />
              <BuyActions
                nft={nft}
                edition={edition}
                quantity={quantity}
                onQuantityChange={setRequested}
              />
              <TokenInfo nft={nft} />
              <ShareLinks nft={nft} />
            </div>
          </div>
        </div>
        <DetailTabs nft={nft} />
        <RelatedNfts nftId={nft.id} />
      </div>
    </article>
  )
}
