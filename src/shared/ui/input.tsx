import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

// Shared field look (Input, Textarea, Select trigger): dark fill, brown border, accent focus
export const fieldClassName =
  'w-full min-w-0 rounded-sm border border-input bg-background px-3 text-body text-foreground transition-colors placeholder:text-subtle hover:border-border-soft focus-visible:border-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldClassName, 'h-10 py-2', className)}
      {...props}
    />
  )
}

export { Input }
