import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

/**
 * Loading placeholder with a shimmer sweep. Give it the size of the content it replaces so
 * nothing shifts when data arrives. Hidden from assistive tech: announce loading on the
 * region (aria-busy) instead. The sweep stops under prefers-reduced-motion.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-sm bg-muted bg-[linear-gradient(100deg,var(--muted)_30%,var(--secondary)_50%,var(--muted)_70%)] bg-size-[200%_100%] motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
