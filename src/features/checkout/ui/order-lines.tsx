import { formatEth } from '@/domain/money'
import type { QuoteLine } from '@/domain/quote'
import { cn } from '@/shared/lib/utils'
import { NftImage } from '@/shared/ui/nft-image'

interface OrderLinesProps {
  lines: QuoteLine[]
  label: string
  // Receipt rows sit on the modal surface; the payment summary shows them as cards
  plain?: boolean
}

// Stacked, the quantity sits under the price so names keep their width. The receipt gets
// the Figma's own columns from md; the 342 px payment column stays stacked, since the
// monospace names would not fit next to two value columns (literal classes for Tailwind)
const LAYOUT = {
  receipt: {
    columns: 'md:grid-cols-[minmax(0,1fr)_4rem_6rem]',
    unstack: 'md:contents',
    quantity: 'md:order-1 md:text-center',
    total: 'md:order-2',
    editions: 'hidden md:block',
  },
  summary: { columns: '', unstack: '', quantity: '', total: '', editions: 'hidden' },
}

/**
 * "Seus NFTs" (Pagamento) and "Detalhes da transação" (receipt): art, name, token id,
 * quantity and line total, always from the API quote or the order snapshot.
 */
export function OrderLines({ lines, label, plain = false }: OrderLinesProps) {
  const layout = plain ? LAYOUT.receipt : LAYOUT.summary
  return (
    <div className="flex flex-col gap-2">
      <div
        aria-hidden="true"
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-14 font-bold',
          layout.columns,
          plain && 'border-b border-border pb-2 md:text-15',
        )}
      >
        <span>NFTs</span>
        <span className={cn('text-center', layout.editions)}>Edições</span>
        <span className="text-right">Subtotal</span>
      </div>
      <ul aria-label={label} className="flex flex-col gap-2 md:gap-3">
        {lines.map((line) => (
          <li
            key={line.lineId}
            className={cn(
              'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3',
              layout.columns,
              !plain && 'rounded-sm bg-card py-1 pr-3 pl-1',
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <NftImage image={line.image} sizes="56px" className="size-14 shrink-0 rounded-sm" />
              <div className="min-w-0">
                <p className="text-14 font-bold break-words">{line.name}</p>
                <p className="text-12 break-words text-subtle">ID do token: #{line.tokenId}</p>
                <p className="sr-only">Edição {line.editionName}</p>
              </div>
            </div>
            <div className={cn('flex flex-col items-end gap-0.5', layout.unstack)}>
              <span
                className={cn(
                  'text-right text-15 font-bold whitespace-nowrap text-accent-foreground',
                  layout.total,
                )}
              >
                {formatEth(line.total)}
              </span>
              <span className={cn('text-13 whitespace-nowrap', layout.quantity)}>
                <span aria-hidden="true">(x {line.quantity})</span>
                <span className="sr-only">Quantidade: {line.quantity}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
