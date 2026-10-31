import type { QueryClient } from '@tanstack/react-query'

import { CART_ID_HEADER, API_PATHS } from '@/domain/api-contract'
import { type Cart, cartSchema } from '@/domain/cart'
import { applyNftUpdateToCartLine } from '@/domain/events'
import { userKey } from '@/features/session'
import type { HttpClient, RealtimeApplier } from '@/shared/api'

import type { CartIdStore } from '../model/cart-id-store'

// ['user', id, 'cart'] and ['visitor', id, 'cart'], not the quotes nested under them
const isCartKey = (key: readonly unknown[]) => key.length === 3 && key[2] === 'cart'

/** `nft.updated` → price and stock of the matching cart lines (quantities are kept). */
export const cartRealtimeApplier: RealtimeApplier = {
  event: 'nft.updated',
  apply(queryClient, event) {
    queryClient.setQueriesData<Cart>({ predicate: (query) => isCartKey(query.queryKey) }, (cart) =>
      cart
        ? { ...cart, lines: cart.lines.map((line) => applyNftUpdateToCartLine(line, event)) }
        : cart,
    )
  },
}

interface MergeOptions {
  http: HttpClient
  queryClient: QueryClient
  cartIds: CartIdStore
  userId: string
}

/**
 * After login, the visitor's cart is folded into the member's (the API adds quantities up
 * to the stock). On failure the visitor id is kept, so the next login tries again.
 */
export async function mergeVisitorCart({ http, queryClient, cartIds, userId }: MergeOptions) {
  const visitorCartId = cartIds.get()
  if (!visitorCartId) return
  try {
    const cart = await http.post<Cart>(API_PATHS.cartMerge, undefined, {
      headers: { [CART_ID_HEADER]: visitorCartId },
      schema: cartSchema,
    })
    // A cart read sent before the merge would land later with the old (empty) cart
    await queryClient.cancelQueries({ queryKey: userKey(userId, 'cart'), exact: true })
    queryClient.setQueryData(userKey(userId, 'cart'), cart)
    cartIds.clear()
  } catch {
    // Items stay in the visitor cart on the API; nothing is lost
  }
}
