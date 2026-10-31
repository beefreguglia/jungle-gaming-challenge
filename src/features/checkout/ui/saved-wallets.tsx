import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { shortenHash } from '@/domain/validation'
import type { Wallet } from '@/domain/wallet'
import { NETWORK_LABEL } from '@/features/catalog'
import { cn } from '@/shared/lib/utils'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'

export const OTHER_WALLET = 'other'

const SLOT_LABEL = { primary: 'Principal', secondary: 'Reserva' } as const

const cardClass =
  'flex cursor-pointer items-center gap-4 rounded-sm border border-border-soft bg-card px-4 py-4 has-data-checked:border-primary'

interface SavedWalletsProps {
  wallets: Wallet[]
  value: string
  onChange: (choice: string) => void
}

/**
 * Figma "Mobile / Pagamento" wallet cards: picking a registered wallet fills the payment
 * fields with it; "Usar outra carteira" (desktop frame) clears them for a manual entry.
 */
export function SavedWallets({ wallets, value, onChange }: SavedWalletsProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-16 font-bold md:text-17">
          Carteira de pagamento
        </h2>
        <Link to="/conta/carteiras" className="text-14 text-accent-foreground hover:underline">
          Gerenciar carteiras
        </Link>
      </div>
      <RadioGroup
        aria-labelledby={headingId}
        value={value}
        onValueChange={onChange}
        className="grid-cols-1 gap-3 md:grid-cols-2"
      >
        {wallets.map((wallet) => (
          <label key={wallet.id} className={cardClass}>
            <RadioGroupItem value={wallet.slot} />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-15 font-bold">
                {SLOT_LABEL[wallet.slot]} · {wallet.nickname}
              </span>
              <span className="truncate text-14 text-subtle">
                {shortenHash(wallet.address)} · Rede {NETWORK_LABEL[wallet.network]}
              </span>
            </span>
          </label>
        ))}
        <label className={cn(cardClass, wallets.length === 0 && 'md:col-span-2')}>
          <RadioGroupItem value={OTHER_WALLET} />
          <span className="flex flex-col gap-1">
            <span className="text-15 font-bold">Usar outra carteira</span>
            <span className="text-14 text-subtle">Preencha os dados abaixo</span>
          </span>
        </label>
      </RadioGroup>
    </section>
  )
}
