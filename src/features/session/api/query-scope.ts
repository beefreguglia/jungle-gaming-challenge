/**
 * Cache isolation. Every query holding private data lives under a scope prefix:
 * `['user', userId, …]` for member data and `['visitor', cartId, …]` for the visitor cart.
 * Switching session removes both scopes wholesale, so one user's data can never be served
 * to another, and the user id in the key keeps parallel sessions apart.
 */
export const USER_SCOPE = 'user'
export const VISITOR_SCOPE = 'visitor'

export const PRIVATE_SCOPES = [USER_SCOPE, VISITOR_SCOPE] as const

export function userKey<const Parts extends readonly unknown[]>(userId: string, ...parts: Parts) {
  return [USER_SCOPE, userId, ...parts] as const
}

export function visitorKey<const Parts extends readonly unknown[]>(
  visitorId: string,
  ...parts: Parts
) {
  return [VISITOR_SCOPE, visitorId, ...parts] as const
}
