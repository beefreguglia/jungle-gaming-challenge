import { delay, HttpResponse } from 'msw'

import { API_PATHS } from '@/domain/api-contract'
import { createOrderInputSchema, IDEMPOTENCY_HEADER } from '@/domain/order'
import { walletConnectionInputSchema } from '@/domain/wallet'

import { parseInput } from '../lib/errors'
import { pattern, type RouteFn } from '../lib/route'
import { connectWallet, createOrder, disconnectWallet, getOrder } from '../services/checkout'
import { requireUser } from '../services/session'

export const checkoutHandlers = (route: RouteFn) => [
  route('post', API_PATHS.walletConnections, async ({ backend, authorization, body }) => {
    const user = requireUser(backend, authorization)
    const input = parseInput(walletConnectionInputSchema, await body())
    return HttpResponse.json(connectWallet(backend, user, input), { status: 201 })
  }),

  route(
    'delete',
    pattern(API_PATHS.walletConnection, 'id'),
    ({ backend, authorization, params }) => {
      disconnectWallet(backend, requireUser(backend, authorization), params.id as string)
      return new HttpResponse(null, { status: 204 })
    },
  ),

  route('post', API_PATHS.orders, async ({ backend, authorization, body, request }) => {
    const user = requireUser(backend, authorization)
    const input = parseInput(createOrderInputSchema, await body())
    const result = createOrder(backend, user, {
      key: request.headers.get(IDEMPOTENCY_HEADER),
      input,
    })
    // order-timeout scenario: the order exists, but the client gives up before the answer
    if (result.responseDelayMs > 0) await delay(result.responseDelayMs)
    return HttpResponse.json(result.order, { status: result.replayed ? 200 : 201 })
  }),

  route('get', pattern(API_PATHS.order, 'id'), ({ backend, authorization, params }) =>
    HttpResponse.json(getOrder(backend, requireUser(backend, authorization), params.id as string)),
  ),
]
