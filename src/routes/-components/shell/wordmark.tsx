import { Link } from '@tanstack/react-router'

import { cn } from '@/shared/lib/utils'

/** "KURIO" wordmark; the Figma uses type, not an image logo. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Kurio, página inicial"
      className={cn(
        'text-body font-bold tracking-[0.12em] hover:text-accent-foreground',
        className,
      )}
    >
      KURIO
    </Link>
  )
}
