import { createContext, use, useSyncExternalStore } from 'react'

import type { CartIdStore } from './model/cart-id-store'

// React 19: render `<CartIdContext value={store}>` directly as the provider
export const CartIdContext = createContext<CartIdStore | null>(null)

export function useCartIdStore(): CartIdStore {
  const store = use(CartIdContext)
  if (!store) throw new Error('useCartIdStore must be used inside <CartIdContext>')
  return store
}

/** Visitor cart id; re-renders when the API assigns one. */
export function useVisitorCartId(): string | null {
  const store = useCartIdStore()
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
