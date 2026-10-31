import { useId } from 'react'
import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

export interface FieldControlProps {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
  'aria-required': true | undefined
}

interface FormFieldProps {
  label: string
  // The Figma uses placeholders only: the label stays for assistive tech
  hideLabel?: boolean
  // Figma's red asterisk; announced through aria-required on the control, not the symbol
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: (control: FieldControlProps) => React.ReactNode
}

/**
 * Label, control, hint and error wired together: the control gets the id, aria-invalid and
 * aria-describedby, so screen readers announce the error with the field.
 */
export function FormField({
  label,
  hideLabel,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-body font-medium', hideLabel && 'sr-only')}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        ) : null}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? true : undefined,
      })}
      {error ? (
        <p id={errorId} className="text-caption text-destructive">
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p id={hintId} className="text-caption text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
