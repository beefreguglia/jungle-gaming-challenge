import { Link } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

interface CartLinkProps {
  count: number
  className?: string
}

/** Cart icon with the unit count badge; the label carries the count for screen readers. */
export function CartLink({ count, className }: CartLinkProps) {
  const label =
    count === 0 ? 'Carrinho vazio' : `Carrinho com ${count} ${count === 1 ? 'item' : 'itens'}`
  return (
    <Link
      to="/carrinho"
      aria-label={label}
      className={cn('relative grid size-10 place-items-center rounded-sm hover:bg-card', className)}
    >
      <ShoppingCartIcon className="size-6" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-tiny font-bold text-primary-foreground"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
