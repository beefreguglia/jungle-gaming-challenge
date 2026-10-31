import { BellRingIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

import type { Cart } from '@/domain/cart'

import { describeCartChanges } from '../model/cart-changes'

/**
 * Tells the user when prices or stock change while the cart is open (Socket.IO or a
 * refetch). Compared during render against the last cart seen, so no effect is needed.
 * The region is polite and stays until dismissed: the summary updates on its own.
 */
export function CartNotices({ cart }: { cart: Cart }) {
  const [seen, setSeen] = useState(cart)
  const [notices, setNotices] = useState<string[]>([])

  if (cart !== seen) {
    const changes = describeCartChanges(seen.lines, cart.lines)
    if (changes.length > 0) setNotices((current) => [...current, ...changes])
    setSeen(cart)
  }

  return (
    <div aria-live="polite" aria-atomic="false">
      {notices.length > 0 && (
        <div className="flex items-start gap-3 rounded-sm border border-primary/60 bg-secondary/60 p-4 text-14">
          <BellRingIcon
            className="mt-0.5 size-5 shrink-0 text-accent-foreground"
            aria-hidden="true"
          />
          <ul className="flex flex-1 flex-col gap-1">
            {notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
            <li className="text-13 text-subtle">O resumo já foi atualizado.</li>
          </ul>
          <button
            type="button"
            aria-label="Fechar avisos do carrinho"
            onClick={() => setNotices([])}
            className="grid size-6 place-items-center rounded-sm hover:text-accent-foreground"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
