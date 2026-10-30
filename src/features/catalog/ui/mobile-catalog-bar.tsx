import { SearchIcon } from 'lucide-react'
import { useEffect, useId, useState } from 'react'

import type { NftFacets, NftListParams } from '@/domain/nft'

import type { CatalogChange } from '../model/catalog-filters'
import { FiltersSheet } from './filters-sheet'

const SEARCH_DEBOUNCE_MS = 400

interface MobileCatalogBarProps {
  params: NftListParams
  facets: NftFacets | undefined
  total: number | undefined
  onChange: CatalogChange
}

/** Figma mobile header: "Explorar coleções" search and the filter button (opens a sheet).
 * Mobile only: from md the header has its own search, and the toolbar shows FiltersSheet. */
export function MobileCatalogBar({ params, facets, total, onChange }: MobileCatalogBarProps) {
  const inputId = useId()
  const urlTerm = params.q ?? ''
  const [term, setTerm] = useState(urlTerm)
  const [sent, setSent] = useState(urlTerm)
  const [syncedFrom, setSyncedFrom] = useState(urlTerm)

  // The URL changed elsewhere (back/forward, "Limpar filtros"): show its term. A change we
  // sent ourselves is skipped, so typing that continued meanwhile is not overwritten.
  if (syncedFrom !== urlTerm) {
    setSyncedFrom(urlTerm)
    if (urlTerm !== sent) setTerm(urlTerm)
  }

  // Search as you type, once typing pauses; one history entry per settled term
  useEffect(() => {
    const next = term.trim()
    if (next === urlTerm) return
    const timer = setTimeout(() => {
      setSent(next)
      onChange({ q: next || undefined })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, urlTerm, onChange])

  return (
    <div className="flex gap-2 md:hidden">
      <form role="search" onSubmit={(event) => event.preventDefault()} className="relative flex-1">
        <label htmlFor={inputId} className="sr-only">
          Explorar coleções
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-[1.375rem] -translate-y-1/2 text-subtle"
        />
        <input
          id={inputId}
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Explorar coleções"
          className="h-[2.8125rem] w-full rounded-[0.625rem] bg-card pr-3 pl-11 text-14 font-bold placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-ring"
        />
      </form>
      <FiltersSheet params={params} facets={facets} total={total} onChange={onChange} />
    </div>
  )
}
