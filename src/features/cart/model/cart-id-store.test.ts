import { describe, expect, it, vi } from 'vitest'

import { createSafeStorage } from '@/shared/lib/storage'

import { createCartIdStore } from './cart-id-store'

describe('cart id store', () => {
  it('persists the visitor cart id and notifies only on real changes', () => {
    const storage = createSafeStorage()
    const store = createCartIdStore(storage)
    const listener = vi.fn()
    store.subscribe(listener)

    store.set('cart_0001')
    store.set('cart_0001')
    expect(listener).toHaveBeenCalledOnce()
    // A new instance over the same storage (a refresh) finds it
    expect(createCartIdStore(storage).get()).toBe('cart_0001')

    store.clear()
    expect(store.get()).toBeNull()
    expect(createCartIdStore(storage).get()).toBeNull()
  })
})
