import { NFT_COLLECTIONS, NFT_NETWORKS, type NftFacets, type NftListParams } from '@/domain/nft'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

import {
  type CatalogChange,
  CLEARED_FILTERS,
  hasActiveFilters,
  toggleValue,
} from '../model/catalog-filters'
import { COLLECTION_LABEL, NETWORK_LABEL } from '../model/catalog-labels'
import { FilterList } from './filter-list'
import { PriceRangeFilter } from './price-range-filter'

interface CatalogFiltersProps {
  params: NftListParams
  facets: NftFacets | undefined
  onChange: CatalogChange
}

/**
 * "Limpar filtros" is always rendered and only disabled without filters, so the controls
 * around it never move when the first filter is picked or the last one removed.
 */
export function ClearFiltersButton({
  params,
  onChange,
  size,
  className,
}: Pick<CatalogFiltersProps, 'params' | 'onChange'> & {
  size?: 'default' | 'lg'
  className?: string
}) {
  return (
    <Button
      variant="outline"
      size={size}
      disabled={!hasActiveFilters(params)}
      className={className}
      onClick={() => onChange(CLEARED_FILTERS)}
    >
      Limpar filtros
    </Button>
  )
}

/** Sidebar filters (desktop) and filter sheet content (mobile): Coleções, Faixa de preço, Rede. */
export function CatalogFilters({ params, facets, onChange }: CatalogFiltersProps) {
  if (!facets) {
    return (
      <div className="flex flex-col gap-4" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- static placeholders
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <FilterList
        title="Coleções"
        options={NFT_COLLECTIONS.map((value) => ({
          value,
          label: COLLECTION_LABEL[value],
          count: facets.collections[value],
        }))}
        selected={params.collections ?? []}
        onToggle={(value) => onChange({ collections: toggleValue(params.collections, value) })}
      />
      <PriceRangeFilter
        // Re-mounts with fresh state when the bounds or the applied range change
        key={`${facets.priceRange.min}-${facets.priceRange.max}-${params.minPrice}-${params.maxPrice}`}
        bounds={facets.priceRange}
        value={{ min: params.minPrice, max: params.maxPrice }}
        onApply={onChange}
      />
      <FilterList
        title="Rede"
        options={NFT_NETWORKS.map((value) => ({
          value,
          label: NETWORK_LABEL[value],
          count: facets.networks[value],
        }))}
        selected={params.networks ?? []}
        onToggle={(value) => onChange({ networks: toggleValue(params.networks, value) })}
      />
    </div>
  )
}
