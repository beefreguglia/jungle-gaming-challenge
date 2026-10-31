import { formatEth, multiplyEth } from '@/domain/money'
import type { NftDetail, NftEdition } from '@/domain/nft'
import { FavoriteButton } from '@/features/favorites'
import { Button } from '@/shared/ui/button'
import { CartIcon } from '@/shared/ui/icons'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'

import { usePurchase } from '../model/use-purchase'

interface BuyActionsProps {
  nft: NftDetail
  edition: NftEdition
  quantity: number
  onQuantityChange: (quantity: number) => void
}

function SoldOutNotice() {
  return (
    <p role="status" className="text-14 text-destructive">
      Esta edição está esgotada. Escolha outra edição.
    </p>
  )
}

/** Mobile "Buy Bar" (fixed at the bottom, replaces the tab bar) and desktop action row. */
export function BuyActions({ nft, edition, quantity, onQuantityChange }: BuyActionsProps) {
  const purchase = usePurchase(nft, edition, quantity)
  const blocked = purchase.soldOut || purchase.pending
  const stepper = (variant: 'compact' | 'round') => (
    <QuantityStepper
      label={`Quantidade de ${nft.name}`}
      value={quantity}
      max={Math.max(1, edition.available)}
      disabled={purchase.soldOut}
      onChange={onQuantityChange}
      variant={variant}
    />
  )

  return (
    <>
      {/* Mobile: Qtd. + total, then "Comprar NFT" and the add-to-cart circle */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-5 rounded-t-3xl bg-card px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-14 text-subtle">Qtd.</span>
            {stepper('compact')}
          </div>
          <p className="text-20 font-bold text-accent-foreground">
            <span className="sr-only">Total: </span>
            {formatEth(multiplyEth(edition.price, quantity))}
          </p>
        </div>
        {purchase.soldOut && <SoldOutNotice />}
        <div className="flex gap-3">
          <Button
            variant="cta"
            size="xl"
            className="flex-1"
            disabled={blocked}
            onClick={purchase.buyNow}
          >
            Comprar NFT
          </Button>
          <button
            type="button"
            aria-label="Adicionar ao carrinho"
            disabled={blocked}
            onClick={purchase.addOnly}
            className="grid size-15 shrink-0 place-items-center rounded-full border border-border-soft bg-secondary text-accent-foreground disabled:opacity-50"
          >
            <CartIcon className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Desktop: stepper, COMPRAR and Favoritar on one row */}
      <div className="hidden flex-col gap-3 md:flex">
        <div className="flex flex-wrap items-center gap-6">
          {stepper('round')}
          <div className="ml-auto flex gap-2">
            <Button
              className="w-[5.75rem] text-13 lg:w-[5.75rem]"
              disabled={blocked}
              onClick={purchase.buyNow}
            >
              COMPRAR
            </Button>
            <FavoriteButton nftId={nft.id} nftName={nft.name} variant="button" />
          </div>
        </div>
        {purchase.soldOut && <SoldOutNotice />}
      </div>
    </>
  )
}
