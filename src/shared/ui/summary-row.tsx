import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

/** One term/value pair of a totals list (`<dl>`); `strong` is the ruled-off "Total" line. */
export function SummaryRow({
  term,
  children,
  strong,
}: {
  term: string
  children: React.ReactNode
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4',
        strong && 'border-t border-border pt-4',
      )}
    >
      <dt className={cn('text-14', strong && 'text-16 font-bold')}>{term}</dt>
      <dd
        className={cn(
          'text-right text-15 whitespace-nowrap md:text-16',
          strong && 'text-18 font-bold text-accent-foreground',
        )}
      >
        {children}
      </dd>
    </div>
  )
}
