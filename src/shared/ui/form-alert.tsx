import { CircleAlertIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

/** Form-level failure (wrong credentials, connection lost), announced when it appears. */
export function FormAlert({ message, className }: { message: string | null; className?: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-sm border border-error/60 bg-error/10 px-3 py-2 text-caption text-destructive',
        className,
      )}
    >
      <CircleAlertIcon className="mt-px size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}
