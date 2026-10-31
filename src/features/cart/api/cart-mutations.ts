import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { API_PATHS } from '@/domain/api-contract'
import { type Cart, cartSchema } from '@/domain/cart'
import { isApiError, useHttpClient } from '@/shared/api'

import { useCartKey } from './cart-queries'

/**
 * Every cart write answers with the whole cart; it replaces the cached one, so the page,
 * the badges and the quote key all move together without an extra request.
 */
function useCartWrite<Input>(write: (input: Input) => Promise<Cart>, failure: string) {
  const queryClient = useQueryClient()
  const key = useCartKey()
  return useMutation({
    mutationFn: write,
    onSuccess: (cart) => {
      if (key) queryClient.setQueryData(key, cart)
    },
    onError: (error) => {
      // Stock moved under us (409): show why and resync with the API
      if (key) void queryClient.invalidateQueries({ queryKey: key })
      toast.error(failure, {
        description: isApiError(error) ? error.message : 'Tente novamente em instantes.',
      })
    },
  })
}

export function useUpdateCartItem() {
  const http = useHttpClient()
  return useCartWrite(
    ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      http.patch<Cart>(API_PATHS.cartItem(lineId), { quantity }, { schema: cartSchema }),
    'Não foi possível alterar a quantidade',
  )
}

export function useRemoveCartItem() {
  const http = useHttpClient()
  return useCartWrite(
    (lineId: string) => http.delete<Cart>(API_PATHS.cartItem(lineId), { schema: cartSchema }),
    'Não foi possível remover o item',
  )
}

/** Coupon errors (invalid/expired) belong to the field, so they are not toasted here. */
export function useApplyCoupon() {
  const http = useHttpClient()
  const queryClient = useQueryClient()
  const key = useCartKey()
  return useMutation({
    mutationFn: (code: string) =>
      http.put<Cart>(API_PATHS.cartCoupon, { code }, { schema: cartSchema }),
    onSuccess: (cart) => {
      if (key) queryClient.setQueryData(key, cart)
    },
  })
}

export function useRemoveCoupon() {
  const http = useHttpClient()
  return useCartWrite(
    () => http.delete<Cart>(API_PATHS.cartCoupon, { schema: cartSchema }),
    'Não foi possível remover o cupom',
  )
}
