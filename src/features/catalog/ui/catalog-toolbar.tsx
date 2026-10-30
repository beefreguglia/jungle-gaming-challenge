import { useId } from 'react'

import { NFT_SORTS, type NftListParams, type NftSort } from '@/domain/nft'
import { cn } from '@/shared/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

import type { CatalogChange } from '../model/catalog-filters'
import { SORT_LABEL, VIEW_TABS } from '../model/catalog-labels'

interface ViewTabsProps {
  view: NftListParams['view']
  onChange: CatalogChange
}

/**
 * "Todos os NFTs / Novos lançamentos / Em alta". They filter the same grid instead of
 * switching panels, so they are toggle buttons (aria-pressed), not ARIA tabs.
 */
export function ViewTabs({ view, onChange }: ViewTabsProps) {
  return (
    <div
      role="group"
      aria-label="Seção do catálogo"
      className="flex flex-wrap gap-x-4 gap-y-2 md:gap-x-5"
    >
      {VIEW_TABS.map((tab) => {
        const active = tab.value === view
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange({ view: tab.value })}
            className={cn(
              'shrink-0 border-b-2 border-transparent pb-1 text-14 whitespace-nowrap hover:text-accent-foreground md:text-15',
              active && 'border-primary font-bold text-accent-foreground',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

interface SortSelectProps {
  sort: NftSort
  onChange: CatalogChange
  className?: string
}

/** "Ordenar por: Listados recentemente ▾" — plain text trigger, as in the Figma toolbar. */
export function SortSelect({ sort, onChange, className }: SortSelectProps) {
  const labelId = useId()
  return (
    <div className={cn('flex items-center gap-1 text-15', className)}>
      <span id={labelId}>Ordenar por:</span>
      <Select value={sort} onValueChange={(value) => onChange({ sort: value as NftSort })}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-auto w-auto gap-1 border-0 bg-transparent px-0 py-0 text-15 hover:text-accent-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {NFT_SORTS.map((value) => (
            <SelectItem key={value} value={value}>
              {SORT_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
