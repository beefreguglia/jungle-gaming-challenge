import { cn } from '@/shared/lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/ui/icons'

import { pageWindow } from '../model/page-window'

interface CatalogPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const squareClass =
  'grid size-[2.1875rem] place-items-center rounded-button border border-border text-14 hover:border-primary hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40'

/** Figma pagination: 35 px squares, current page filled in orange. The arrows are
 * always there (disabled at the ends), so the row never shifts between pages. */
export function CatalogPagination({ page, totalPages, onPageChange }: CatalogPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-center md:justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={squareClass}
          >
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
          </button>
        </li>
        {pageWindow(page, totalPages).map((number) => (
          <li key={number}>
            <button
              type="button"
              aria-label={`Página ${number}`}
              aria-current={number === page ? 'page' : undefined}
              onClick={() => onPageChange(number)}
              className={cn(
                squareClass,
                number === page &&
                  'border-primary bg-primary font-bold text-primary-foreground hover:text-primary-foreground',
              )}
            >
              {number}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={squareClass}
          >
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
