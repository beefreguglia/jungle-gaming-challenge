import type { ZodType } from 'zod'

import { API_ERROR_CODES, type ApiErrorBody, type ApiErrorCode } from '@/domain/errors'

/**
 * Thrown by mock services; the route wrapper turns it into the REST error envelope.
 * Services stay transport-free and unit-testable.
 */
export class MockApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fields?: Record<string, string>

  constructor(init: {
    status: number
    code: ApiErrorCode
    message: string
    fields?: Record<string, string>
  }) {
    super(init.message)
    this.status = init.status
    this.code = init.code
    this.fields = init.fields
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message, fields: this.fields } }
  }
}

const C = API_ERROR_CODES

export const fail = {
  validation: (fields: Record<string, string>, message = 'Verifique os campos destacados') =>
    new MockApiError({ status: 422, code: C.validation, message, fields }),
  unauthenticated: () =>
    new MockApiError({
      status: 401,
      code: C.unauthenticated,
      message: 'Faça login para continuar',
    }),
  sessionExpired: () =>
    new MockApiError({
      status: 401,
      code: C.sessionExpired,
      message: 'Sua sessão expirou. Entre novamente para continuar',
    }),
  notFound: (message: string) => new MockApiError({ status: 404, code: C.notFound, message }),
  conflict: (code: ApiErrorCode, message: string, fields?: Record<string, string>) =>
    new MockApiError({ status: 409, code, message, fields }),
  unprocessable: (code: ApiErrorCode, message: string, fields?: Record<string, string>) =>
    new MockApiError({ status: 422, code, message, fields }),
  forbidden: (code: ApiErrorCode, message: string) =>
    new MockApiError({ status: 403, code, message }),
  unavailable: () =>
    new MockApiError({
      status: 503,
      code: C.transient,
      message: 'Serviço temporariamente indisponível. Tente novamente',
    }),
}

/** Validates a request body with the shared domain schema; 422 with per-field messages. */
export function parseInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    fields[issue.path.join('.') || 'form'] ??= issue.message
  }
  throw fail.validation(fields)
}
