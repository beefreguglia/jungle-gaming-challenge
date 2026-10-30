import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import type { CurrentSession, Session } from '@/domain/auth'
import { ApiError } from '@/shared/api'
import { createSafeStorage } from '@/shared/lib/storage'

import { userKey, visitorKey } from '../api/query-scope'
import type { SessionApi } from '../api/session-api'
import { createSessionManager } from './session-manager'
import { createSessionStore } from './session-store'

const NOW = Date.parse('2026-10-30T12:00:00.000Z')

function session(userId: string, overrides: Partial<Session> = {}): Session {
  return {
    token: `token-${userId}`,
    user: {
      id: userId,
      username: userId,
      email: `${userId}@kurio.art`,
      displayName: userId,
      avatarUrl: null,
    },
    expiresAt: '2026-10-30T20:00:00.000Z',
    ...overrides,
  }
}

function setup(api: Partial<SessionApi> = {}) {
  const queryClient = new QueryClient()
  const store = createSessionStore(createSafeStorage())
  const scheduled: { run: () => void; delay: number }[] = []
  const fullApi: SessionApi = {
    signIn: vi.fn(async () => session('nova')),
    signUp: vi.fn(async () => session('kai')),
    current: vi.fn(async (): Promise<CurrentSession> => ({
      user: session('nova').user,
      expiresAt: '2026-10-30T22:00:00.000Z',
    })),
    signOut: vi.fn(async () => {}),
    ...api,
  }
  const manager = createSessionManager({
    store,
    api: fullApi,
    queryClient,
    now: () => NOW,
    schedule: (run, delay) => {
      scheduled.push({ run, delay })
      return () => {}
    },
  })
  return { manager, store, queryClient, api: fullApi, scheduled }
}

describe('session manager', () => {
  it('stores the session on sign-in and schedules a check at expiry', async () => {
    const { manager, store, scheduled } = await setup()
    await manager.signIn({ email: 'nova@kurio.art', password: 'kurio1234' })
    expect(store.get()?.user.id).toBe('nova')
    expect(scheduled.at(-1)?.delay).toBe(8 * 60 * 60 * 1000)
  })

  it('purges private cache when the user changes, keeping public data', async () => {
    const { manager, queryClient } = setup()
    await manager.signIn({ email: 'nova@kurio.art', password: 'kurio1234' })
    queryClient.setQueryData(userKey('nova', 'favorites'), { nftIds: ['a'] })
    queryClient.setQueryData(visitorKey('cart_1', 'cart'), { lines: [] })
    queryClient.setQueryData(['nfts', 'list'], { items: [] })

    await manager.signUp({ username: 'kai', email: 'kai@kurio.art', password: 'kurio1234' })

    expect(queryClient.getQueryData(userKey('nova', 'favorites'))).toBeUndefined()
    expect(queryClient.getQueryData(visitorKey('cart_1', 'cart'))).toBeUndefined()
    expect(queryClient.getQueryData(['nfts', 'list'])).toEqual({ items: [] })
  })

  it('expires on a 401 during validation and remembers why', async () => {
    const unauthorized = new ApiError({
      kind: 'unauthorized',
      status: 401,
      code: 'session_expired',
      message: 'expired',
    })
    const { manager, store, queryClient } = setup({
      current: vi.fn(async () => Promise.reject(unauthorized)),
    })
    store.set(session('nova'))
    queryClient.setQueryData(userKey('nova', 'profile'), { displayName: 'Nova' })

    await manager.validate()

    expect(store.getSnapshot()).toEqual({ session: null, endedReason: 'expired' })
    expect(queryClient.getQueryData(userKey('nova', 'profile'))).toBeUndefined()
  })

  it('keeps the session when validation fails for network reasons', async () => {
    const offline = new ApiError({ kind: 'network', message: 'offline' })
    const { manager, store } = setup({ current: vi.fn(async () => Promise.reject(offline)) })
    store.set(session('nova'))
    await manager.validate()
    expect(store.get()?.user.id).toBe('nova')
  })

  it('ignores a validation answer that arrives after the user changed', async () => {
    let resolve: (value: CurrentSession) => void = () => {}
    const { manager, store } = setup({
      current: vi.fn(() => new Promise<CurrentSession>((r) => (resolve = r))),
    })
    store.set(session('nova'))
    const pending = manager.validate()
    store.set(session('kai'))
    resolve({ user: session('nova').user, expiresAt: '2026-10-30T22:00:00.000Z' })
    await pending
    expect(store.get()?.user.id).toBe('kai')
  })

  it('purges private cache when another tab logs out (store changed from outside)', async () => {
    const { manager, store, queryClient } = setup()
    await manager.signIn({ email: 'nova@kurio.art', password: 'kurio1234' })
    queryClient.setQueryData(userKey('nova', 'orders'), [{ id: 'order_1' }])

    // What the `storage` event listener does when another tab removes the session
    store.clear('logout')

    expect(queryClient.getQueryData(userKey('nova', 'orders'))).toBeUndefined()
  })

  it('schedules the expiry check for a session that another tab created', () => {
    const { store, scheduled } = setup()
    store.set(session('kai', { expiresAt: '2026-10-30T13:00:00.000Z' }))
    expect(scheduled.at(-1)?.delay).toBe(60 * 60 * 1000)
  })

  it('keeps cached data when the same user refreshes the session', async () => {
    const { manager, queryClient } = setup()
    await manager.signIn({ email: 'nova@kurio.art', password: 'kurio1234' })
    queryClient.setQueryData(userKey('nova', 'profile'), { displayName: 'Nova' })
    await manager.validate()
    expect(queryClient.getQueryData(userKey('nova', 'profile'))).toEqual({ displayName: 'Nova' })
  })

  it('stops reacting to the store after dispose', async () => {
    const { manager, store, queryClient } = setup()
    await manager.signIn({ email: 'nova@kurio.art', password: 'kurio1234' })
    queryClient.setQueryData(userKey('nova', 'orders'), [])
    manager.dispose()
    store.clear('logout')
    expect(queryClient.getQueryData(userKey('nova', 'orders'))).toEqual([])
  })

  it('logs out locally even if the API is unreachable, sending the old token', async () => {
    const signOut = vi.fn(async () => Promise.reject(new Error('offline')))
    const { manager, store } = setup({ signOut })
    store.set(session('nova'))
    await manager.logout()
    expect(store.getSnapshot()).toEqual({ session: null, endedReason: 'logout' })
    expect(signOut).toHaveBeenCalledWith('token-nova')
  })
})
