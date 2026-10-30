import { SlidersHorizontalIcon } from 'lucide-react'

import type { NftFacets, NftListParams } from '@/domain/nft'
import { Button } from '@/shared/ui/button'
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
import { CatalogFilters } from './catalog-filters'
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
          className="relative grid size-[2.8125rem] shrink-0 place-items-center rounded-[0.875rem] bg-[linear-gradient(137deg,rgb(210_138_76/0.45)_25%,var(--primary)_100%)] text-foreground"
        >
          <SlidersHorizontalIcon className="size-[1.375rem]" aria-hidden="true" />
          {hasActiveFilters(params) && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-foreground"
            />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl">
        <div className="flex flex-col gap-6 p-6">
          <div>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              {total === undefined ? 'Carregando…' : resultsLabel(total)}
            </SheetDescription>
          </div>
          <SortSelect sort={params.sort} onChange={onChange} />
          <CatalogFilters params={params} facets={facets} onChange={onChange} />
          <SheetClose asChild>
            <Button size="lg">Ver resultados</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
