import * as React from 'react'

import { cn } from '@/shared/lib/utils'

import { fieldClassName } from './input'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClassName, 'flex field-sizing-content min-h-32 py-2', className)}
      {...props}
    />
  )
}

export { Textarea }
