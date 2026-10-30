import { isAxiosError, isCancel } from 'axios'

import {
  type ApiErrorKind,
  apiErrorBodySchema,
  isRetryableKind,
  kindFromStatus,
} from '@/domain/errors'

interface ApiErrorInit {
  kind: ApiErrorKind
  message: string
  status?: number
  code?: string
  fields?: Record<string, string>
  cause?: unknown
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly code?: string
  readonly fields?: Record<string, string>

  constructor({ kind, message, status, code, fields, cause }: ApiErrorInit) {
    super(message, { cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
    this.fields = fields
  }

  get isRetryable(): boolean {
    return isRetryableKind(this.kind)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT'])

/** Normalizes anything thrown by the transport into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error

  if (isCancel(error)) {
    return new ApiError({ kind: 'canceled', message: 'Request canceled', cause: error })
  }

  if (!isAxiosError(error)) {
    return new ApiError({ kind: 'unknown', message: 'Unexpected error', cause: error })
  }

  if (!error.response) {
    const isTimeout = TIMEOUT_CODES.has(error.code ?? '')
    return new ApiError({
      kind: isTimeout ? 'timeout' : 'network',
      message: isTimeout ? 'Request timed out' : 'Network unavailable',
      cause: error,
    })
  }

  const { status, data } = error.response
  const body = apiErrorBodySchema.safeParse(data)

  return new ApiError({
    kind: kindFromStatus(status),
    status,
    message: body.success ? body.data.error.message : error.message,
    code: body.success ? body.data.error.code : undefined,
    fields: body.success ? body.data.error.fields : undefined,
    cause: error,
  })
}
