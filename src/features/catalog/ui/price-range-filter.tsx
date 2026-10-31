import { useId, useState } from 'react'

import { type Eth, formatEth } from '@/domain/money'
import { Button } from '@/shared/ui/button'
import { Slider } from '@/shared/ui/slider'

// The slider works in hundredths of ETH; the URL and API keep decimal strings
const toCents = (eth: Eth) => Math.round(Number(eth) * 100)
const toEth = (cents: number): Eth => (cents / 100).toFixed(2)
const label = (cents: number) => formatEth(toEth(cents), { withUnit: false })

interface PriceRangeFilterProps {
  // Cheapest and most expensive NFT of the current section (from the API facets)
  bounds: { min: Eth; max: Eth }
  value: { min?: Eth; max?: Eth }
  onApply: (range: { minPrice?: Eth; maxPrice?: Eth }) => void
}

/**
 * "Faixa de preço": dragging only previews; "Aplicar" commits to the URL, so the catalog is
 * not refetched on every pixel of a drag. The ends of the track mean "no limit".
 */
export function PriceRangeFilter({ bounds, value, onApply }: PriceRangeFilterProps) {
  const titleId = useId()
  const floor = Math.floor(toCents(bounds.min))
  const ceil = Math.ceil(toCents(bounds.max))
  const [range, setRange] = useState<number[]>([
    value.min ? toCents(value.min) : floor,
    value.max ? toCents(value.max) : ceil,
  ])
  const [low = floor, high = ceil] = range

  function apply() {
    onApply({
      minPrice: low > floor ? toEth(low) : undefined,
      maxPrice: high < ceil ? toEth(high) : undefined,
    })
  }

  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-3">
      {/* Group label, not a section heading: it sat out of the heading order */}
      <p id={titleId} className="text-16 font-bold">
        Faixa de preço
      </p>
      <Slider
        min={floor}
        max={ceil}
        step={1}
        minStepsBetweenThumbs={1}
        value={range}
        onValueChange={setRange}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        formatValue={(cents) => `${label(cents)} ETH`}
      />
      <p className="text-14">
        Preço: {label(low)} - {label(high)} ETH
      </p>
      <Button size="sm" className="w-fit text-14" onClick={apply}>
        Aplicar
      </Button>
    </div>
  )
}
