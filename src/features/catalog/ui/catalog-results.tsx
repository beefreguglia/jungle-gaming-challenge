import type { NftListParams } from '@/domain/nft'
import { cn } from '@/shared/lib/utils'

import type { useNftList } from '../api/use-nft-list'
import { type CatalogChange, CLEARED_FILTERS, hasActiveFilters } from '../model/catalog-filters'
import { CatalogPagination } from './catalog-pagination'
import { CatalogEmpty, CatalogError, InvalidPriceRange } from './catalog-states'
import { NftGrid, NftGridSkeleton } from './nft-grid'

interface CatalogResultsProps {
  params: NftListParams
  list: ReturnType<typeof useNftList>
  onChange: CatalogChange
  onPageChange: (page: number) => void
}

/**
 * Grid area with every state: first load (skeleton), refresh (previous results dimmed),
 * empty, error with retry and impossible price range.
 */
export function CatalogResults({ params, list, onChange, onPageChange }: CatalogResultsProps) {
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
  if (isPending || !data)
    return <NftGridSkeleton count={params.pageSize > 6 ? 6 : params.pageSize} />
  if (data.items.length === 0) {
    return (
      <CatalogEmpty filtered={hasActiveFilters(params)} onClear={() => onChange(CLEARED_FILTERS)} />
    )
  }

  return (
    <div className="flex flex-col gap-10 md:gap-16">
      <NftGrid
        items={data.items}
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
