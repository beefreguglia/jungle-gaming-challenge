import { Children, type ReactNode, useEffect, useRef, useState } from 'react'

import { cn } from '@/shared/lib/utils'

interface CarouselProps {
  // Accessible name of the list, e.g. "Mais desta coleção"
  label: string
  children: ReactNode
  // Width of each item per breakpoint (Tailwind basis classes)
  itemClassName?: string
  className?: string
}

/**
 * Horizontal row with native scrolling and snap (touch, trackpad and keyboard via Tab all
 * work), plus the Figma dots, which show and set the current page.
 */
export function Carousel({ label, children, itemClassName, className }: CarouselProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      setPages(Math.max(1, Math.round(list.scrollWidth / list.clientWidth)))
      setPage(Math.round(list.scrollLeft / list.clientWidth))
    }
    // The observer also fires once right away, which takes the first measurement
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    list.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      list.removeEventListener('scroll', measure)
    }
  }, [])

  function goTo(index: number) {
    const list = listRef.current
    list?.scrollTo({ left: index * list.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <ul
        ref={listRef}
        aria-label={label}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto pb-2 md:gap-6"
      >
        {Children.map(children, (child) => (
          <li
            className={cn(
              'shrink-0 basis-[45%] snap-start md:basis-[30%] lg:basis-[calc(20%-1.2rem)]',
              itemClassName,
            )}
          >
            {child}
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div role="group" aria-label={`Páginas de ${label}`} className="flex justify-center">
          {Array.from({ length: pages }, (_, index) => (
            <button
              // oxlint-disable-next-line react/no-array-index-key -- pages are positional
              key={index}
              type="button"
              aria-label={`Página ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              onClick={() => goTo(index)}
              className="group/dot grid size-6 place-items-center"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2.5 rounded-full border border-primary group-hover/dot:bg-primary/50',
                  index === page && 'bg-primary',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
