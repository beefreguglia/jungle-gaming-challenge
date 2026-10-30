import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/domain/events'

import type { RealtimeClient, RealtimeStatus } from './realtime-client'
import { createRealtimeSync, type RealtimeApplier } from './realtime-sync'

function fakeClient() {
  const listeners = new Map<string, Set<(payload: unknown) => void>>()
  const statusListeners = new Set<(next: RealtimeStatus, previous: RealtimeStatus) => void>()
  let status: RealtimeStatus = 'idle'
  const client: RealtimeClient = {
    get status() {
      return status
    },
    connect: () => {},
    disconnect: () => {},
    reconnect: () => {},
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)?.add(listener)
      return () => void listeners.get(event)?.delete(listener)
    },
    onStatus(listener) {
      statusListeners.add(listener)
      return () => void statusListeners.delete(listener)
    },
  }
  return {
    client,
    emit: (event: string, payload: unknown) => listeners.get(event)?.forEach((fn) => fn(payload)),
    setStatus(next: RealtimeStatus) {
      const previous = status
      status = next
      statusListeners.forEach((fn) => fn(next, previous))
    },
    listenerCount: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
  }
}

const nftEvent = (id: string): NftUpdatedEvent => ({
  id,
  type: 'nft.updated',
  resource: { type: 'nft', id: 'emerald-ape-042' },
  version: 2,
  occurredAt: '2026-10-30T12:00:00.000Z',
  userId: null,
  data: { price: '1.29', editions: [] },
})

const orderEvent = (userId: string): OrderUpdatedEvent => ({
  id: `order-${userId}`,
  type: 'order.updated',
  resource: { type: 'order', id: 'order_1' },
  version: 2,
  occurredAt: '2026-10-30T12:00:00.000Z',
  userId,
  data: {
    status: 'confirmed',
    transaction: null,
    refusalReason: null,
    updatedAt: '2026-10-30T12:00:00.000Z',
  },
})

function setup(userId: string | null = 'nova') {
  const fake = fakeClient()
  const queryClient = new QueryClient()
  const onNft = vi.fn()
  const onOrder = vi.fn()
  const appliers: RealtimeApplier[] = [
    { event: 'nft.updated', apply: onNft },
    { event: 'order.updated', apply: onOrder },
  ]
  const sync = createRealtimeSync({
    client: fake.client,
    queryClient,
    getUserId: () => userId,
    appliers,
  })
  return { ...fake, queryClient, sync, onNft, onOrder }
}

describe('realtime sync', () => {
  it('applies a valid event once, even if delivered twice', () => {
    const { emit, onNft } = setup()
    emit('nft.updated', nftEvent('evt-1'))
    emit('nft.updated', nftEvent('evt-1'))
    expect(onNft).toHaveBeenCalledOnce()
  })

  it('drops malformed payloads', () => {
    const { emit, onNft } = setup()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    emit('nft.updated', { ...nftEvent('evt-1'), data: { price: 1.29 } })
    expect(onNft).not.toHaveBeenCalled()
  })

  it('never applies another user’s events', () => {
    const { emit, onOrder } = setup('kai')
    emit('order.updated', orderEvent('nova'))
    emit('order.updated', orderEvent('kai'))
    expect(onOrder).toHaveBeenCalledOnce()
    expect(onOrder.mock.calls[0]?.[1]).toMatchObject({ userId: 'kai' })
  })

  it('reconciles realtime queries after a reconnection, not on the first connection', async () => {
    const { setStatus, queryClient } = setup()
    await queryClient.prefetchQuery({
      queryKey: ['live'],
      queryFn: () => 'live',
      meta: { realtime: true },
    })
    await queryClient.prefetchQuery({ queryKey: ['plain'], queryFn: () => 'plain' })
    const spy = vi.spyOn(queryClient, 'invalidateQueries')

    setStatus('connected')
    expect(spy).not.toHaveBeenCalled()

    setStatus('reconnecting')
    setStatus('connected')
    expect(spy).toHaveBeenCalledOnce()

    const predicate = spy.mock.calls[0]?.[0]?.predicate
    const cache = queryClient.getQueryCache()
    expect(predicate?.(cache.find({ queryKey: ['live'] })!)).toBe(true)
    expect(predicate?.(cache.find({ queryKey: ['plain'] })!)).toBe(false)
  })

  it('lets the same event id through again after a session reset', () => {
    const { emit, sync, onNft } = setup()
    emit('nft.updated', nftEvent('evt-1'))
    sync.resetSession()
    emit('nft.updated', nftEvent('evt-1'))
    expect(onNft).toHaveBeenCalledTimes(2)
  })

  it('releases every listener on dispose', () => {
    const { sync, listenerCount } = setup()
    expect(listenerCount()).toBe(2)
    sync.dispose()
    expect(listenerCount()).toBe(0)
  })
})
