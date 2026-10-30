import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useCallback } from 'react'

import {
  defaultNftListParams,
  type NftListParams,
  nftListParamsSchema,
  updateNftListParams,
} from '@/domain/nft'
import {
  CatalogSection,
  featuredNftQueryOptions,
  HomeHero,
  MobileCatalogBar,
  nftListQueryOptions,
  useNftList,
} from '@/features/catalog'

import { MintJournal } from './-components/home/mint-journal'
import { PromoBanners } from './-components/home/promo-banners'

export const Route = createFileRoute('/')({
  // Catalog state lives in the URL: search, filters, sort and page survive refresh/history
  validateSearch: nftListParamsSchema,
  // Defaults stay out of the address bar ("/" instead of "/?view=all&sort=recent&page=1")
  search: { middlewares: [stripSearchParams(defaultNftListParams)] },
  loaderDeps: ({ search }) => search,
  // Starts the requests during navigation without blocking it: the page shows skeletons
  loader: ({ context: { queryClient, http }, deps }) => {
    void queryClient.prefetchQuery(nftListQueryOptions(http, deps))
    void queryClient.prefetchQuery(featuredNftQueryOptions(http))
  },
  head: () => ({
    meta: [
      { title: 'Kurio · Marketplace de NFTs' },
      {
        name: 'description',
        content:
          'Descubra NFTs selecionados de criadores emergentes e consagrados: busque, filtre por coleção, rede e preço e colecione arte digital verificada.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  const params = Route.useSearch()
  const navigate = Route.useNavigate()
  const list = useNftList(params)

  // Each change is its own history entry, so back/forward walks through the searches
  const onChange = useCallback(
    (patch: Partial<NftListParams>) =>
      navigate({
        search: (previous) => updateNftListParams(previous, patch),
        resetScroll: false,
      }),
    [navigate],
  )

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-6 pt-10 md:gap-24 md:px-4 md:pt-8 xl:px-0">
      <MobileCatalogBar
        params={params}
        facets={list.data?.facets}
        total={list.data?.total}
        onChange={onChange}
      />
      <HomeHero />
      <CatalogSection params={params} onChange={onChange} />
      <PromoBanners />
      <MintJournal />
    </div>
  )
}
