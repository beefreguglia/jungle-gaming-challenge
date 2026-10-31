import type { NftListParams } from '@/domain/nft'
import { cn } from '@/shared/lib/utils'

import type { useNftList } from '../api/use-nft-list'
import { type CatalogChange, CLEARED_FILTERS, hasActiveFilters } from '../model/catalog-filters'
import { CatalogPagination } from './catalog-pagination'
import { CatalogEmpty, CatalogError, InvalidPriceRange } from './catalog-states'
import { NftGrid, NftGridSkeleton, type RenderCardActions } from './nft-grid'

interface CatalogResultsProps {
  params: NftListParams
  list: ReturnType<typeof useNftList>
  onChange: CatalogChange
  onPageChange: (page: number) => void
  renderCardActions?: RenderCardActions
}

/**
 * Grid area with every state: first load (skeleton), refresh (previous results dimmed),
 * empty, error with retry and impossible price range.
 */
export function CatalogResults({
  params,
  list,
  onChange,
  onPageChange,
  renderCardActions,
}: CatalogResultsProps) {
  const { data, error, isPending, isFetching, isPlaceholderData, invalidRange } = list

  if (invalidRange) {
    return (
      <InvalidPriceRange onReset={() => onChange({ minPrice: undefined, maxPrice: undefined })} />
    )
  }
  // An error with nothing to show; with cached results, keep them and let the retry run
  if (error && !data) {
    return <CatalogError error={error} onRetry={() => void list.refetch()} retrying={isFetching} />
  }
  // A full page of placeholders plus the pagination row, so nothing below moves on arrival
  if (isPending || !data) {
    return (
      <div className="flex flex-col gap-10 md:gap-16">
        <NftGridSkeleton count={params.pageSize} />
        <div aria-hidden="true" className="h-[2.1875rem]" />
      </div>
    )
  }
  if (data.items.length === 0) {
    return (
      <CatalogEmpty filtered={hasActiveFilters(params)} onClear={() => onChange(CLEARED_FILTERS)} />
    )
  }

  return (
    <div className="flex flex-col gap-10 md:gap-16">
      <NftGrid
        items={data.items}
        renderActions={renderCardActions}
        className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}
      />
      <CatalogPagination
        page={data.page}
        totalPages={data.totalPages}
        onPageChange={onPageChange}
      />
    </div>
  )
}
