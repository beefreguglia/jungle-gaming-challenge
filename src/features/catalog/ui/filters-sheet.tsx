import type { NftFacets, NftListParams } from '@/domain/nft'
import { Button } from '@/shared/ui/button'
import { FilterIcon } from '@/shared/ui/icons'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet'

import { type CatalogChange, hasActiveFilters } from '../model/catalog-filters'
import { resultsLabel } from '../model/catalog-labels'
import { CatalogFilters, ClearFiltersButton } from './catalog-filters'
import { SortSelect } from './catalog-toolbar'

interface FiltersSheetProps {
  params: NftListParams
  facets: NftFacets | undefined
  total: number | undefined
  onChange: CatalogChange
}

/**
 * Figma mobile filter button (orange gradient). Opens a bottom sheet with sort and the same
 * filters as the desktop sidebar; used below lg, where there is no sidebar.
 */
export function FiltersSheet({ params, facets, total, onChange }: FiltersSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={hasActiveFilters(params) ? 'Filtros (ativos)' : 'Filtros'}
          className="relative grid size-[2.8125rem] shrink-0 place-items-center rounded-[0.875rem] bg-[linear-gradient(137deg,rgb(210_138_76/0.45)_25%,var(--primary)_100%)] text-primary-foreground"
        >
          <FilterIcon />
          {hasActiveFilters(params) && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary-foreground"
            />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-3xl">
        <div className="flex flex-col gap-6 overflow-y-auto p-6">
          <div>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              {total === undefined ? 'Carregando…' : resultsLabel(total)}
            </SheetDescription>
          </div>
          <SortSelect sort={params.sort} onChange={onChange} />
          <CatalogFilters params={params} facets={facets} onChange={onChange} />
        </div>
        {/* Both actions stay in reach at the bottom of the sheet, however long the list */}
        <div className="grid grid-cols-2 gap-3 border-t border-border-soft p-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <ClearFiltersButton params={params} onChange={onChange} size="lg" />
          <SheetClose asChild>
            <Button size="lg">Ver resultados</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
