import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { API_PATHS } from '@/domain/api-contract'
import { type Cart, canCheckout } from '@/domain/cart'
import type { NftNetwork } from '@/domain/nft'
import { quoteSchema } from '@/domain/quote'
import { useHttpClient } from '@/shared/api'

import { useCartKey } from './cart-queries'

/** Everything the API prices: a new value here means the quote must be asked again. */
function cartFingerprint(cart: Cart): string {
  const lines = cart.lines.map(
    (line) => `${line.id}:${line.quantity}:${line.unitPrice}:${line.available}`,
  )
  return `${cart.couponCode ?? ''}|${lines.join(',')}`
}

/**
 * The summary's numbers (subtotal, discount, network fee, total) always come from the API
 * quote, never from client math. It is re-requested whenever the cart changes, including
 * price/stock changes pushed by Socket.IO. A cart with blocked lines gets no quote.
 */
export function useCartQuote(cart: Cart | undefined, network: NftNetwork = 'ethereum') {
  const http = useHttpClient()
  const cartKey = useCartKey()
  const ready = Boolean(cart && cartKey && canCheckout(cart))
  return useQuery({
    queryKey: [...(cartKey ?? []), 'quote', network, cart ? cartFingerprint(cart) : ''],
    queryFn: ({ signal }) =>
      http.post(API_PATHS.quotes, { network }, { schema: quoteSchema, signal }),
    enabled: ready,
    // Keeps the previous totals on screen (dimmed) while the new quote arrives
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
