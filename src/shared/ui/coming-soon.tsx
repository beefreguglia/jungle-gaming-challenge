import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

interface ComingSoonProps {
  children: React.ReactNode
  className?: string
  // Shown in the tooltip and announced to screen readers
  reason?: string
}

/**
 * Stand-in for an action that is outside the delivered scope (editorial pages, support,
 * creator studio…). It stays visible to keep the layout, is focusable so keyboard users
 * learn why it does nothing, and never pretends to work.
 */
export function ComingSoon({ children, className, reason = 'Em breve' }: ComingSoonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-disabled="true"
          onClick={(event) => event.preventDefault()}
          className={cn('cursor-not-allowed text-left opacity-60', className)}
        >
          {children}
          <span className="sr-only"> ({reason})</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
