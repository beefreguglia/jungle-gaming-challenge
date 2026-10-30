import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { useId } from 'react'

import { isEditionAvailable, type NftEdition } from '@/domain/nft'
import { cn } from '@/shared/lib/utils'

interface EditionChipsProps {
  editions: NftEdition[]
  value: string
  onChange: (editionId: string) => void
}

/**
 * "Edição: 1/1 1/10 1/50 ABERTA" — single choice, so a radio group (arrow keys move).
 * Sold-out editions stay selectable to show their state, struck through and named as such;
 * the buy actions explain that they cannot be bought.
 */
export function EditionChips({ editions, value, onChange }: EditionChipsProps) {
  const labelId = useId()
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-14 font-bold md:text-15">
        Edição:
      </p>
      <RadioGroupPrimitive.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={onChange}
        className="flex flex-wrap gap-3"
      >
        {editions.map((edition) => {
          const soldOut = !isEditionAvailable(edition)
          return (
            <RadioGroupPrimitive.Item
              key={edition.id}
              value={edition.id}
              className={cn(
                'h-7 rounded-full border border-border-soft px-2.5 text-13 uppercase transition-colors hover:border-primary data-[state=checked]:border-primary data-[state=checked]:font-bold data-[state=checked]:text-accent-foreground',
                soldOut && 'text-subtle line-through',
              )}
            >
              {edition.name}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </RadioGroupPrimitive.Item>
          )
        })}
      </RadioGroupPrimitive.Root>
    </div>
  )
}
