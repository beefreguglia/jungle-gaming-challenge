import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'

import {
  NftDetailSkeleton,
  NftDetailView,
  NftNotFound,
  nftDetailQueryOptions,
} from '@/features/nft-detail'
import { isApiError, useHttpClient } from '@/shared/api'

const detailSearchSchema = z.object({
  // Selected edition, so a shared link opens the same edition
  edicao: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/nfts/$nftId')({
  validateSearch: detailSearchSchema,
  loader: async ({ context: { queryClient, http }, params }) => {
    try {
      const nft = await queryClient.ensureQueryData(nftDetailQueryOptions(http, params.nftId))
      return { name: nft.name, description: nft.description }
    } catch (error) {
      // Direct access to an id that does not exist: the route's not-found screen
      if (isApiError(error) && error.kind === 'not_found') throw notFound()
      throw error
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} · Kurio` : 'NFT não encontrado · Kurio' },
      {
        name: 'description',
        content: loaderData?.description ?? 'Este NFT não existe ou foi removido do mercado.',
      },
    ],
  }),
  // Skeleton while the API answers (slow networks); kept briefly to avoid a flash
  pendingComponent: NftDetailSkeleton,
  pendingMs: 150,
  pendingMinMs: 300,
  notFoundComponent: NftNotFound,
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { edicao } = Route.useSearch()
  const navigate = Route.useNavigate()
  const http = useHttpClient()
  // Same cache entry the loader filled; realtime events keep it current
  const { data: nft } = useSuspenseQuery(nftDetailQueryOptions(http, nftId))

  return (
    <NftDetailView
      key={nft.id}
      nft={nft}
      editionId={edicao}
      onEditionChange={(id) =>
        navigate({ search: { edicao: id }, replace: true, resetScroll: false })
      }
    />
  )
}
