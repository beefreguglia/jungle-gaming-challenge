import { z } from 'zod'

// Error envelope returned by every REST endpoint (and by the MSW handlers)
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    // Field path → message, for form validation errors (400/422)
    fields: z.record(z.string(), z.string()).optional(),
  }),
})

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

/**
 * Business error codes carried in `error.code`. The HTTP status picks the category
 * (ApiErrorKind); the code tells the UI exactly what happened inside it.
 */
export const API_ERROR_CODES = {
  validation: 'validation_failed',
  invalidCredentials: 'invalid_credentials',
  sessionExpired: 'session_expired',
  unauthenticated: 'unauthenticated',
  forbidden: 'forbidden',
  notFound: 'not_found',
  emailTaken: 'email_taken',
  usernameTaken: 'username_taken',
  wrongPassword: 'wrong_password',
  couponInvalid: 'coupon_invalid',
  couponExpired: 'coupon_expired',
  editionUnavailable: 'edition_unavailable',
  quantityExceeded: 'quantity_exceeded',
  quoteOutdated: 'quote_outdated',
  quoteExpired: 'quote_expired',
  cartEmpty: 'cart_empty',
  idempotencyConflict: 'idempotency_conflict',
  walletRejected: 'wallet_rejected',
  transient: 'service_unavailable',
} as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]

/**
 * Transport-agnostic error categories. UI, retry and session logic branch on these,
 * never on raw HTTP status codes.
 */
export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'transient'
  | 'timeout'
  | 'network'
  | 'canceled'
  | 'contract'
  | 'unknown'

const RETRYABLE: ReadonlySet<ApiErrorKind> = new Set(['transient', 'timeout', 'network'])

export function isRetryableKind(kind: ApiErrorKind): boolean {
  return RETRYABLE.has(kind)
}

export function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 408 || status === 429 || status >= 500) return 'transient'
  return 'unknown'
}
