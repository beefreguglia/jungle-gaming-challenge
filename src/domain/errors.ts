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
