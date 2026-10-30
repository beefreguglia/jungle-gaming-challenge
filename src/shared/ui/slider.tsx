import { Slider as SliderPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/shared/lib/utils'

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  // One accessible name per thumb ("Preço mínimo", "Preço máximo"); required for a11y
  thumbLabels: readonly string[]
  // Spoken value per thumb, e.g. "0,02 ETH" instead of the raw number
  formatValue?: (value: number) => string
}

/** Figma "Faixa de preço": orange track and thumbs. Each thumb is labelled for screen readers. */
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  formatValue,
  ...props
}: SliderProps) {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'relative flex w-full touch-none items-center py-2 select-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-0.5 w-full grow overflow-hidden rounded-full bg-primary/40"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {values.map((thumbValue, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          // Thumbs are positional; their identity is the index
          // oxlint-disable-next-line react/no-array-index-key
          key={index}
          aria-label={thumbLabels[index]}
          aria-valuetext={formatValue?.(thumbValue)}
          className="relative block size-4 shrink-0 rounded-full border-2 border-primary bg-primary transition-shadow select-none after:absolute after:-inset-3 hover:ring-4 hover:ring-primary/30 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
