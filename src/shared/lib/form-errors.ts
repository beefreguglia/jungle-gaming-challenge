import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { isApiError } from '@/shared/api'

export const CONNECTION_MESSAGE =
  'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.'
export const GENERIC_MESSAGE = 'Algo deu errado. Tente novamente.'

// Answers whose message the API writes for people (pt-BR), safe to show as is
const USER_FACING_KINDS = new Set([
  'validation',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
])

interface ApplyApiErrorOptions<T extends FieldValues> {
  setError: UseFormSetError<T>
  // Form fields that can receive a message from `error.fields`
  fields: readonly Path<T>[]
}

/**
 * Puts an API failure on a form: messages for known fields go next to their inputs (the
 * first one gets focus); anything else comes back as a form-level message to render.
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: unknown,
  { setError, fields }: ApplyApiErrorOptions<T>,
): string | null {
  if (!isApiError(error)) return GENERIC_MESSAGE

  const known = fields.filter((field) => error.fields?.[field])
  known.forEach((field, index) => {
    setError(
      field,
      { type: 'server', message: error.fields?.[field] },
      { shouldFocus: index === 0 },
    )
  })
  if (known.length > 0) return null

  if (error.isRetryable) return CONNECTION_MESSAGE
  return USER_FACING_KINDS.has(error.kind) ? error.message : GENERIC_MESSAGE
}
