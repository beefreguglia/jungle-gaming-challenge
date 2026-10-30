import { API_ERROR_CODES } from '@/domain/errors'
import type { ApiError, HttpErrorContext } from '@/shared/api'

const SESSION_REJECTED = new Set<string | undefined>([
  API_ERROR_CODES.sessionExpired,
  API_ERROR_CODES.unauthenticated,
])

/**
 * True when a failed request proves the API no longer accepts our token. Other 401s
 * (wrong password on a sign-in form) are form errors, not the end of the session.
 */
export function isSessionRejection(
  error: ApiError,
  { sentAuthorization }: HttpErrorContext,
): boolean {
  return error.kind === 'unauthorized' && sentAuthorization && SESSION_REJECTED.has(error.code)
}
