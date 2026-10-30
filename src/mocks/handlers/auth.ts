import { HttpResponse } from 'msw'

import { API_PATHS } from '@/domain/api-contract'
import { signInInputSchema, signUpInputSchema } from '@/domain/auth'

import { parseInput } from '../lib/errors'
import type { RouteFn } from '../lib/route'
import { currentSession, signIn, signOut, signUp } from '../services/session'

export const authHandlers = (route: RouteFn) => [
  route('post', API_PATHS.signUp, async ({ backend, body }) => {
    const session = await signUp(backend, parseInput(signUpInputSchema, await body()))
    return HttpResponse.json(session, { status: 201 })
  }),

  route('post', API_PATHS.signIn, async ({ backend, body }) =>
    HttpResponse.json(await signIn(backend, parseInput(signInInputSchema, await body()))),
  ),

  route('get', API_PATHS.session, ({ backend, authorization }) =>
    HttpResponse.json(currentSession(backend, authorization)),
  ),

  route('delete', API_PATHS.session, ({ backend, authorization }) => {
    signOut(backend, authorization)
    return new HttpResponse(null, { status: 204 })
  }),
]
