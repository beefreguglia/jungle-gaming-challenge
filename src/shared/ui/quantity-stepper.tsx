import { MinusIcon, PlusIcon } from 'lucide-react'
import { useId } from 'react'

import { cn } from '@/shared/lib/utils'

interface QuantityStepperProps {
  value: number
  max: number
  onChange: (value: number) => void
  // Accessible name of the group, e.g. "Quantidade de Emerald Ape #042"
  label: string
  min?: number
  disabled?: boolean
  // "compact": small rounded squares (mobile frames); "round": 30 px circles (desktop detail)
  variant?: 'compact' | 'round'
  className?: string
}

const buttonClass = {
  compact: 'size-5 rounded-md',
  round: 'size-[1.875rem] rounded-full',
}

/**
 * − value + with the limits enforced and explained: at the maximum the + button is
 * disabled and the reason ("máximo disponível") is read with the group.
 */
export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  min = 1,
  disabled = false,
  variant = 'compact',
  className,
}: QuantityStepperProps) {
  const hintId = useId()
  const atMax = value >= max
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)))
  const control = cn(
    'grid place-items-center bg-primary text-primary-foreground transition-colors hover:bg-accent-foreground disabled:cursor-not-allowed disabled:opacity-40',
    buttonClass[variant],
  )

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={atMax && !disabled ? hintId : undefined}
      className={cn('flex items-center gap-3', className)}
    >
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={disabled || value <= min}
        onClick={() => step(-1)}
        className={control}
      >
        <MinusIcon className="size-3.5" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-5 text-center text-18">
        {value}
      </output>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={disabled || atMax}
        onClick={() => step(1)}
        className={control}
      >
        <PlusIcon className="size-3.5" aria-hidden="true" />
      </button>
      {atMax && !disabled && (
        <span id={hintId} className="text-12 text-subtle">
          Máximo disponível
        </span>
      )}
    </div>
  )
}
