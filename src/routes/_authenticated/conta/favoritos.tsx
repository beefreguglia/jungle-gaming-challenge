import { useQueries } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'

import type { NftDetail } from '@/domain/nft'
import { NftGrid, NftGridSkeleton } from '@/features/catalog'
import { FavoriteButton, useFavorites } from '@/features/favorites'
import { nftDetailQueryOptions } from '@/features/nft-detail'
import { useHttpClient } from '@/shared/api'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/_authenticated/conta/favoritos')({
  head: () => ({
    meta: [
      { title: 'Lista de interesse · Kurio' },
      { name: 'description', content: 'Os NFTs que você favoritou na Kurio.' },
    ],
  }),
  component: FavoritesPage,
})

/** "Lista de interesse": the member's favorites, newest first; un-favoriting removes the card. */
function FavoritesPage() {
  const http = useHttpClient()
  const favorites = useFavorites()
  const ids = (favorites.data?.nftIds ?? []).toReversed()
  const nfts = useQueries({
    queries: ids.map((id) => nftDetailQueryOptions(http, id)),
    combine: (results) => ({
      items: results.flatMap((result) => (result.data ? [result.data] : [])) as NftDetail[],
      pending: results.some((result) => result.isPending),
    }),
  })

  let content: React.ReactNode
  if (favorites.isPending || nfts.pending) {
    content = <NftGridSkeleton count={Math.min(Math.max(ids.length, 2), 6)} />
  } else if (favorites.isError) {
    content = (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>Não foi possível carregar seus favoritos.</p>
        <Button onClick={() => void favorites.refetch()}>Tentar novamente</Button>
      </div>
    )
  } else if (nfts.items.length === 0) {
    content = (
      <div className="flex flex-col items-start gap-4 rounded-sm border border-dashed border-border-soft p-8">
        <HeartIcon className="size-8 text-accent-foreground" aria-hidden="true" />
        <p className="text-14 text-muted-foreground">
          Você ainda não favoritou nenhum NFT. Toque no coração de um NFT para guardá-lo aqui.
        </p>
        <Button asChild>
          <Link to="/" hash="catalogo">
            Explorar o catálogo
          </Link>
        </Button>
      </div>
    )
  } else {
    content = (
      <NftGrid
        items={nfts.items}
        renderActions={(nft) => (
          <FavoriteButton
            nftId={nft.id}
            nftName={nft.name}
            className="absolute top-4 right-3 z-10"
          />
        )}
      />
    )
  }

  return (
    <section aria-labelledby="favorites-heading" className="mt-8 flex flex-col gap-6">
      <h2 id="favorites-heading" className="text-20 font-bold">
        Lista de interesse
      </h2>
      {content}
    </section>
  )
}
