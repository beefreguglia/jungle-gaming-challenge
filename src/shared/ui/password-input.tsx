import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

import { Input } from './input'

/** Password field with the Figma's eye toggle; the toggle is a real, labelled button. */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeIcon : EyeOffIcon

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <button
        type="button"
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-sm text-subtle hover:text-accent-foreground"
      >
        <Icon className="size-4" aria-hidden="true" />
        <span className="sr-only">Mostrar senha</span>
      </button>
    </div>
  )
}
