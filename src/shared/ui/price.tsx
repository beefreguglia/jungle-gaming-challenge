import { type Eth, formatEth } from '@/domain/money'
import { cn } from '@/shared/lib/utils'

interface PriceProps {
  value: Eth
  // Previous price, shown struck through when the item is on sale
  compareAt?: Eth
  className?: string
}

/**
 * ETH price as drawn in the Figma ("1.99 ETH 2.29 ETH"). The sale price is announced first
 * and the old one is labelled, since a strike-through alone is invisible to screen readers.
 */
export function Price({ value, compareAt, className }: PriceProps) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-baseline gap-x-2 font-bold text-accent-foreground',
        className,
      )}
    >
      <span>{formatEth(value)}</span>
      {compareAt && (
        <span className="font-normal text-subtle line-through">
          <span className="sr-only">Preço anterior: </span>
          {formatEth(compareAt)}
        </span>
      )}
    </p>
  )
}
