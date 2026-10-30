import type { SimpleIcon } from 'simple-icons'

import { cn } from '@/shared/lib/utils'

interface BrandIconProps {
  icon: SimpleIcon
  className?: string
  // Use the brand's own color instead of the current text color
  colored?: boolean
}

/** Brand logos (social networks, sign-in providers) from simple-icons; decorative only. */
export function BrandIcon({ icon, className, colored = false }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={cn('size-4', className)}
      fill={colored ? `#${icon.hex}` : 'currentColor'}
    >
      <path d={icon.path} />
    </svg>
  )
}
