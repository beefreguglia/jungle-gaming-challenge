import { useState } from 'react'

import type { Cart } from '@/domain/cart'
import type { NftNetwork } from '@/domain/nft'
import type { Quote } from '@/domain/quote'
import { useCartQuote } from '@/features/cart'

import { reviewQuote } from '../model/quote-review'

/**
 * The cart's API quote for the chosen network, plus the one the user reviewed. When a new
 * quote brings different values (realtime price/stock change, refused order), `changes`
 * lists them and the order is blocked until `accept()`.
 */
export function useQuoteReview(cart: Cart, network: NftNetwork) {
  const quote = useCartQuote(cart, network)
  const [reviewed, setReviewed] = useState<Quote | null>(null)
  // A placeholder belongs to the previous key (other network): never review against it
  const latest = quote.data && !quote.isPlaceholderData ? quote.data : undefined
  const review = latest ? reviewQuote(reviewed, latest) : null
  if (review && review.reviewed !== reviewed) setReviewed(review.reviewed)

  return {
    quote,
    reviewed: review?.reviewed ?? null,
    changes: review?.changes ?? [],
    accept: () => {
      if (latest) setReviewed(latest)
    },
  }
}
