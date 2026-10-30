import { useId } from 'react'

import { cn } from '@/shared/lib/utils'

interface FilterOption<T extends string> {
  value: T
  label: string
  count: number
}

interface FilterListProps<T extends string> {
  title: string
  options: FilterOption<T>[]
  selected: readonly T[]
  onToggle: (value: T) => void
}

/**
 * Multi-select list from the Figma sidebar ("Arte digital (33)"). Each row is a toggle
 * button; selection is shown by color *and* a check mark, and announced via aria-pressed.
 */
export function FilterList<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: FilterListProps<T>) {
  const titleId = useId()
  return (
    <fieldset aria-labelledby={titleId} className="flex flex-col gap-3">
      <legend id={titleId} className="mb-1 text-16 font-bold">
        {title}
      </legend>
      <ul className="flex flex-col gap-1">
        {options.map(({ value, label, count }) => {
          const active = selected.includes(value)
          return (
            <li key={value}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(value)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-14 text-foreground/90 hover:bg-secondary/60 hover:text-accent-foreground',
                  active && 'font-bold text-accent-foreground',
                )}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="w-3 text-12">
                    {active ? '✓' : ''}
                  </span>
                  {label}
                </span>
                <span className={cn('text-13', active ? 'text-accent-foreground' : 'text-subtle')}>
                  ({count})
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
