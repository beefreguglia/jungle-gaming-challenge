import { Link } from '@tanstack/react-router'

import { type CartLine, cartLineStatus, cartLineTotal } from '@/domain/cart'
import { formatEth } from '@/domain/money'
import { cn } from '@/shared/lib/utils'
import { DeleteIcon } from '@/shared/ui/icons'
import { NftImage } from '@/shared/ui/nft-image'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'

import { useRemoveCartItem, useUpdateCartItem } from '../api/cart-mutations'

function StockProblem({ line, onFix }: { line: CartLine; onFix: (quantity: number) => void }) {
  const status = cartLineStatus(line)
  if (status === 'ok') return null
  return (
    <p className="col-span-full flex flex-wrap items-center gap-x-2 px-3 pb-3 text-13 text-destructive md:px-2 md:pb-1">
      {status === 'sold_out'
        ? 'Esgotado. Remova o item para finalizar.'
        : `Restam apenas ${line.available} unidade(s).`}
      {status === 'exceeds_stock' && (
        <button type="button" onClick={() => onFix(line.available)} className="font-bold underline">
          Ajustar para {line.available}
        </button>
      )}
    </p>
  )
}

/**
 * Mobile: card with 100 px art, name, edition, line total and stepper (Figma "Item").
 * md+: table row — NFT, unit price, quantity, total, remove.
 */
export function CartLineRow({ line }: { line: CartLine }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const status = cartLineStatus(line)
  const busy = update.isPending || remove.isPending
  const setQuantity = (quantity: number) => update.mutate({ lineId: line.id, quantity })

  return (
    <li
      className={cn(
        'relative grid grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 overflow-hidden rounded-xl bg-card pr-3 md:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_2.5rem] md:rounded-sm md:py-2 md:pr-4 md:pl-2',
        status !== 'ok' && 'ring-1 ring-destructive/60',
        busy && 'opacity-70',
      )}
    >
      <div className="row-span-2 flex items-center gap-3 md:row-span-1">
        <NftImage
          image={line.image}
          sizes="(min-width: 768px) 56px, 100px"
          className="size-[6.25rem] rounded-l-xl md:size-14 md:rounded-sm"
        />
        <div className="hidden min-w-0 md:block">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: line.nftId }}
            className="block truncate text-15 font-bold hover:text-accent-foreground"
          >
            {line.name}
          </Link>
          <p className="text-13 text-subtle">
            Edição {line.editionName} · ID do token: #{line.tokenId}
          </p>
        </div>
      </div>

      {/* Mobile texts (the desktop ones sit next to the art) */}
      <div className="flex min-w-0 flex-col gap-1 pt-3 pr-8 md:hidden">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: line.nftId }}
          className="truncate text-15 font-bold"
        >
          {line.name}
        </Link>
        <p className="text-14 text-subtle">Edição: {line.editionName}</p>
      </div>

      <p className="hidden text-15 font-bold md:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(line.unitPrice)}
      </p>

      <div className="flex items-center justify-between gap-2 pb-3 md:contents">
        <p className="text-16 font-bold text-accent-foreground md:order-last md:hidden">
          <span className="sr-only">Total do item: </span>
          {formatEth(cartLineTotal(line))}
        </p>
        <QuantityStepper
          label={`Quantidade de ${line.name}, edição ${line.editionName}`}
          value={line.quantity}
          max={Math.max(line.quantity, line.available)}
          disabled={busy || status === 'sold_out'}
          onChange={setQuantity}
        />
        <p className="hidden text-15 font-bold text-accent-foreground md:block">
          <span className="sr-only">Total do item: </span>
          {formatEth(cartLineTotal(line))}
        </p>
      </div>

      <button
        type="button"
        aria-label={`Remover ${line.name} (${line.editionName}) do carrinho`}
        disabled={busy}
        onClick={() => remove.mutate(line.id)}
        className="absolute top-2 right-2 grid size-8 place-items-center rounded-sm text-primary hover:text-accent-foreground md:static md:justify-self-end"
      >
        <DeleteIcon className="size-6" />
      </button>

      <StockProblem line={line} onFix={setQuantity} />
    </li>
  )
}
