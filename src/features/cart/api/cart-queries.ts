import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { API_PATHS } from '@/domain/api-contract'
import { type AddCartItemInput, type Cart, cartItemCount, cartSchema } from '@/domain/cart'
import { useSession, userKey, visitorKey } from '@/features/session'
import { useHttpClient } from '@/shared/api'

import { useCartIdStore, useVisitorCartId } from '../context'

type CartKey = ReturnType<typeof userKey> | ReturnType<typeof visitorKey>

/**
 * Whose cart: the member's (by session) or the visitor's (by stored id). A visitor without
 * an id has no cart yet; the first "add" creates one and the API returns its id.
 */
export function useCartKey(): CartKey | null {
  const { session } = useSession()
  const visitorCartId = useVisitorCartId()
  if (session) return userKey(session.user.id, 'cart')
  return visitorCartId ? visitorKey(visitorCartId, 'cart') : null
}

export function cartQueryOptions(http: ReturnType<typeof useHttpClient>, key: CartKey) {
  return queryOptions({
    queryKey: key,
    // X-Cart-Id or the session token is added by the HTTP client (src/app/services.ts)
    queryFn: ({ signal }) => http.get(API_PATHS.cart, { schema: cartSchema, signal }),
    // Prices and stock in the cart must be current: always revalidate on mount
    staleTime: 0,
    meta: { realtime: true },
  })
}

export function useCart() {
  const http = useHttpClient()
  const key = useCartKey()
  return useQuery({
    ...cartQueryOptions(http, key ?? visitorKey('none', 'cart')),
    enabled: key !== null,
  })
}

/** Units in the cart for the header and tab bar badges. */
export function useCartCount(): number {
  return cartItemCount(useCart().data)
}

export function useAddToCart() {
  const http = useHttpClient()
  const queryClient = useQueryClient()
  const cartIds = useCartIdStore()
  const { session } = useSession()

  return useMutation({
    mutationFn: (input: AddCartItemInput) =>
      http.post<Cart>(API_PATHS.cartItems, input, { schema: cartSchema }),
    onSuccess: (cart) => {
      // A visitor's first item creates the cart: remember its id for the next requests
      if (!session) cartIds.set(cart.id)
      const key = session ? userKey(session.user.id, 'cart') : visitorKey(cart.id, 'cart')
      queryClient.setQueryData(key, cart)
    },
  })
}
