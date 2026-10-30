import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

import { pageWindow } from '../model/page-window'

interface CatalogPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const squareClass =
  'grid size-[2.1875rem] place-items-center rounded-sm border border-border text-14 hover:border-primary hover:text-accent-foreground'

/** Figma pagination: 35 px squares, current page filled in orange, arrows only when useful. */
export function CatalogPagination({ page, totalPages, onPageChange }: CatalogPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-center md:justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <button
              type="button"
              aria-label="Página anterior"
              onClick={() => onPageChange(page - 1)}
              className={squareClass}
            >
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            </button>
          </li>
        )}
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
        {page < totalPages && (
          <li>
            <button
              type="button"
              aria-label="Próxima página"
              onClick={() => onPageChange(page + 1)}
              className={squareClass}
            >
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
