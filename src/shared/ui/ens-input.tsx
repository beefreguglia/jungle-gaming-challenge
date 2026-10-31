import { useId } from 'react'
import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

import { Input } from './input'

/**
 * "Nome ENS": the Figma draws ".eth" as a select beside the field, but it has a single
 * option, so it is a fixed label instead of a control that pretends to offer a choice.
 * The suffix is spoken through the field description.
 */
export function EnsInput({
  className,
  'aria-describedby': describedBy,
  ...props
}: React.ComponentProps<'input'>) {
  const suffixId = useId()
  return (
    <div className="flex gap-2.5">
      <span
        id={suffixId}
        className="grid h-10 shrink-0 place-items-center rounded-sm border border-input px-3 text-15"
      >
        <span aria-hidden="true">.eth</span>
        <span className="sr-only">O nome termina em .eth</span>
      </span>
      <Input
        {...props}
        aria-describedby={[describedBy, suffixId].filter(Boolean).join(' ')}
        autoCapitalize="none"
        spellCheck={false}
        className={cn('flex-1', className)}
      />
    </div>
  )
}
