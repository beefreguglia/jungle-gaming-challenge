import { useRef } from 'react'

import type { NftListParams } from '@/domain/nft'

import { useNftList } from '../api/use-nft-list'
import type { CatalogChange } from '../model/catalog-filters'
import { resultsLabel } from '../model/catalog-labels'
import { CatalogFilters } from './catalog-filters'
import { CatalogResults } from './catalog-results'
import { SortSelect, ViewTabs } from './catalog-toolbar'
import { FeaturedNft } from './featured-nft'
import { FiltersSheet } from './filters-sheet'
import type { RenderCardActions } from './nft-grid'

interface CatalogSectionProps {
  params: NftListParams
  onChange: CatalogChange
  renderCardActions?: RenderCardActions
}

/**
 * Figma "Products": filter sidebar + featured banner (from lg), toolbar with tabs and sort,
 * grid and pagination. URL state comes in as `params`; every change goes out via `onChange`.
 */
export function CatalogSection({ params, onChange, renderCardActions }: CatalogSectionProps) {
  const list = useNftList(params)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const total = list.data?.total

  function goToPage(page: number) {
    onChange({ page })
    // New page: bring the user to the top of the results and say where they are
    headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    headingRef.current?.focus({ preventScroll: true })
  }

  return (
    <section
      id="catalogo"
      aria-labelledby="catalog-heading"
      aria-busy={list.isFetching}
      className="grid scroll-mt-6 gap-6 lg:grid-cols-[minmax(0,19.375rem)_minmax(0,1fr)] lg:gap-12"
    >
      <aside aria-label="Filtros do catálogo" className="hidden flex-col gap-6 lg:flex">
        <div className="rounded-sm bg-card p-6">
          <CatalogFilters params={params} facets={list.data?.facets} onChange={onChange} />
        </div>
        <FeaturedNft />
      </aside>

      <div className="flex min-w-0 flex-col gap-6 md:gap-8">
        <h2 id="catalog-heading" ref={headingRef} tabIndex={-1} className="sr-only">
          Catálogo de NFTs
        </h2>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <ViewTabs view={params.view} onChange={onChange} />
          <div className="hidden items-center gap-4 md:flex">
            <SortSelect sort={params.sort} onChange={onChange} />
            {/* Tablet: no sidebar yet, so filters open in the sheet */}
            <div className="lg:hidden">
              <FiltersSheet
                params={params}
                facets={list.data?.facets}
                total={total}
                onChange={onChange}
              />
            </div>
          </div>
        </div>
        {/* Announces result counts after each search, filter or page change */}
        <p aria-live="polite" className="sr-only">
          {total === undefined ? '' : `${resultsLabel(total)}, página ${params.page}`}
        </p>
        <CatalogResults
          params={params}
          list={list}
          onChange={onChange}
          onPageChange={goToPage}
          renderCardActions={renderCardActions}
        />
      </div>
    </section>
  )
}
