import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { API_PATHS } from '@/domain/api-contract'
import { favoritesSchema } from '@/domain/favorites'
import { nftListResponseSchema } from '@/domain/nft'
import { userKey } from '@/features/session'
import { createMemoryStorage } from '@/mocks/db/storage'
import { createMockServer } from '@/mocks/server'
import { isApiError } from '@/shared/api'
import { createSafeStorage } from '@/shared/lib/storage'

/**
 * The real app wiring (Axios client, session manager, cache) against the real mock
 * backend through MSW in Node: proves the transport and session contracts end to end.
 */
const API_URL = 'http://localhost/api'
const mock = createMockServer({ apiBase: API_URL, storage: createMemoryStorage() })
const server = setupServer(...mock.handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  mock.control.setScenario('instant')
  mock.control.reset()
})

let storage = createSafeStorage()
beforeEach(() => {
  storage = createSafeStorage()
})

async function services() {
  const { createAppServices } = await import('./services')
  return createAppServices({ apiUrl: API_URL, storage })
}

const NOVA = { email: 'nova@kurio.art', password: 'kurio1234' }

describe('app services against the mock API', () => {
  it('serializes list filters the way the API expects', async () => {
    const { http } = await services()
    const page = await http.get(API_PATHS.nfts, {
      params: { collections: ['music', 'gaming'], sort: 'price-asc' },
      schema: nftListResponseSchema,
    })
    expect(page.total).toBeGreaterThan(0)
    expect(page.items.every((nft) => ['music', 'gaming'].includes(nft.collection))).toBe(true)
  })

  it('sends the session token on private requests', async () => {
    const { http, session } = await services()
    await session.signIn(NOVA)
    const favorites = await http.get(API_PATHS.favorites, { schema: favoritesSchema })
    expect(favorites.nftIds).toContain('sage-nomad-009')
  })

  it('ends the session and purges private cache when the API rejects the token', async () => {
    const { http, session, queryClient } = await services()
    await session.signIn(NOVA)
    queryClient.setQueryData(userKey('user-nova', 'favorites'), { nftIds: ['x'] })

    mock.control.expireSessions()
    const failure = await http.get(API_PATHS.favorites).catch((error: unknown) => error)

    expect(isApiError(failure) && failure.code).toBe('session_expired')
    expect(session.store.getSnapshot()).toEqual({ session: null, endedReason: 'expired' })
    expect(queryClient.getQueryData(userKey('user-nova', 'favorites'))).toBeUndefined()
  })

  it('keeps the session on a 401 that is not about the token', async () => {
    const { session } = await services()
    await session.signIn(NOVA)
    await expect(session.signIn({ ...NOVA, password: 'errada123' })).rejects.toMatchObject({
      code: 'invalid_credentials',
    })
    expect(session.store.get()?.user.id).toBe('user-nova')
  })

  it('validates a stored session on boot and refreshes it', async () => {
    const first = await services()
    await first.session.signIn(NOVA)

    // Same storage, new app instance: like a page refresh
    const second = await services()
    expect(second.session.store.get()?.user.id).toBe('user-nova')
    await second.session.validate()
    expect(second.session.store.get()?.user.id).toBe('user-nova')
  })

  it('logs out on the server too', async () => {
    const { http, session } = await services()
    const { token } = await session.signIn(NOVA)
    await session.logout()

    const failure = await http
      .get(API_PATHS.session, { headers: { Authorization: `Bearer ${token}` } })
      .catch((error: unknown) => error)
    expect(isApiError(failure) && failure.status).toBe(401)
  })
})
