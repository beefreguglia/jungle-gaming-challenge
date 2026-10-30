/**
 * REST paths, relative to the API base URL. Features build requests from these and MSW
 * registers handlers from them, so a path can never drift between client and mocks.
 * Request/response schemas live next to each resource (auth.ts, cart.ts, …).
 */
export const API_PATHS = {
  signUp: '/auth/sign-up',
  signIn: '/auth/sign-in',
  session: '/session',

  nfts: '/nfts',
  nft: (id: string) => `/nfts/${encodeURIComponent(id)}`,
  relatedNfts: (id: string) => `/nfts/${encodeURIComponent(id)}/related`,

  favorites: '/favorites',
  favorite: (nftId: string) => `/favorites/${encodeURIComponent(nftId)}`,

  cart: '/cart',
  cartItems: '/cart/items',
  cartItem: (lineId: string) => `/cart/items/${encodeURIComponent(lineId)}`,
  cartCoupon: '/cart/coupon',
  cartMerge: '/cart/merge',

  quotes: '/quotes',

  walletConnections: '/wallet-connections',
  walletConnection: (id: string) => `/wallet-connections/${encodeURIComponent(id)}`,

  orders: '/orders',
  order: (id: string) => `/orders/${encodeURIComponent(id)}`,

  profile: '/profile',
  profileAvatar: '/profile/avatar',
  profilePassword: '/profile/password',

  wallets: '/wallets',
  wallet: (slot: 'primary' | 'secondary') => `/wallets/${slot}`,
} as const

// Visitor cart id, sent on every cart request while logged out and on POST /cart/merge
export const CART_ID_HEADER = 'X-Cart-Id'

export const AUTH_HEADER = 'Authorization'

export function bearer(token: string): string {
  return `Bearer ${token}`
}
