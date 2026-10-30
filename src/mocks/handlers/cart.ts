import { HttpResponse } from 'msw'

import { API_PATHS, CART_ID_HEADER } from '@/domain/api-contract'
import {
  addCartItemInputSchema,
  applyCouponInputSchema,
  updateCartItemInputSchema,
} from '@/domain/cart'
import { createQuoteInputSchema } from '@/domain/quote'

import { parseInput } from '../lib/errors'
import { pattern, type RouteContext, type RouteFn } from '../lib/route'
import {
  addItem,
  mergeVisitorCart,
  removeItem,
  resolveCart,
  setCoupon,
  toCartView,
  updateItem,
} from '../services/cart'
import { createQuote } from '../services/checkout'
import { optionalUser, requireUser } from '../services/session'

function cartFor({ backend, authorization, request }: RouteContext) {
  const user = optionalUser(backend, authorization)
  const cart = resolveCart(backend, { user, cartId: request.headers.get(CART_ID_HEADER) })
  return { user, cart }
}

export const cartHandlers = (route: RouteFn) => [
  route('get', API_PATHS.cart, (context) =>
    HttpResponse.json(toCartView(context.backend, cartFor(context).cart)),
  ),

  route('post', API_PATHS.cartItems, async (context) => {
    const input = parseInput(addCartItemInputSchema, await context.body())
    return HttpResponse.json(addItem(context.backend, cartFor(context).cart, input))
  }),

  route('patch', pattern(API_PATHS.cartItem, 'lineId'), async (context) => {
    const { quantity } = parseInput(updateCartItemInputSchema, await context.body())
    const change = { lineId: context.params.lineId as string, quantity }
    return HttpResponse.json(updateItem(context.backend, cartFor(context).cart, change))
  }),

  route('delete', pattern(API_PATHS.cartItem, 'lineId'), (context) =>
    HttpResponse.json(
      removeItem(context.backend, cartFor(context).cart, context.params.lineId as string),
    ),
  ),

  route('put', API_PATHS.cartCoupon, async (context) => {
    const { code } = parseInput(applyCouponInputSchema, await context.body())
    return HttpResponse.json(setCoupon(context.backend, cartFor(context).cart, code))
  }),

  route('delete', API_PATHS.cartCoupon, (context) =>
    HttpResponse.json(setCoupon(context.backend, cartFor(context).cart, null)),
  ),

  route('post', API_PATHS.cartMerge, ({ backend, authorization, request }) => {
    const user = requireUser(backend, authorization)
    return HttpResponse.json(mergeVisitorCart(backend, user, request.headers.get(CART_ID_HEADER)))
  }),

  route('post', API_PATHS.quotes, async (context) => {
    const { network } = parseInput(createQuoteInputSchema, (await context.body()) ?? {})
    const { user, cart } = cartFor(context)
    return HttpResponse.json(createQuote(context.backend, { cart, user, network }), { status: 201 })
  }),
]
