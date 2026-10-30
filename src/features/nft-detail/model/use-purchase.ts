import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { isEditionAvailable, type NftDetail, type NftEdition } from '@/domain/nft'
import { useAddToCart } from '@/features/cart'
import { isApiError } from '@/shared/api'

/**
 * Detail page purchase: "Comprar" adds the selection and opens the cart; the cart icon
 * only adds. Stock rules are enforced by the API too (409), whose message is shown as is.
 */
export function usePurchase(nft: NftDetail, edition: NftEdition, quantity: number) {
  const addToCart = useAddToCart()
  const navigate = useNavigate()
  const soldOut = !isEditionAvailable(edition)

  function add(thenOpenCart: boolean) {
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          if (thenOpenCart) {
            void navigate({ to: '/carrinho' })
            return
          }
          toast.success(`${nft.name} (${edition.name}) no carrinho`, {
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
          })
        },
        onError: (error) => {
          toast.error('Não foi possível adicionar ao carrinho', {
            description: isApiError(error) ? error.message : 'Tente novamente em instantes.',
          })
        },
      },
    )
  }

  return {
    soldOut,
    pending: addToCart.isPending,
    buyNow: () => add(true),
    addOnly: () => add(false),
  }
}
