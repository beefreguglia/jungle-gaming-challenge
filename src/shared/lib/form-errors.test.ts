import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'

import { applyApiErrorToForm, CONNECTION_MESSAGE, GENERIC_MESSAGE } from './form-errors'

type Form = { email: string; password: string }
const fields = ['email', 'password'] as const

describe('applyApiErrorToForm', () => {
  it('sends field messages to their inputs and focuses the first one', () => {
    const setError = vi.fn()
    const error = new ApiError({
      kind: 'conflict',
      message: 'Este e-mail já está cadastrado',
      fields: { email: 'Este e-mail já está cadastrado', other: 'ignored' },
    })

    expect(applyApiErrorToForm<Form>(error, { setError, fields })).toBeNull()
    expect(setError).toHaveBeenCalledOnce()
    expect(setError).toHaveBeenCalledWith(
      'email',
      { type: 'server', message: 'Este e-mail já está cadastrado' },
      { shouldFocus: true },
    )
  })

  it('returns the API message for user-facing failures without fields', () => {
    const error = new ApiError({ kind: 'unauthorized', message: 'E-mail ou senha incorretos' })
    expect(applyApiErrorToForm<Form>(error, { setError: vi.fn(), fields })).toBe(
      'E-mail ou senha incorretos',
    )
  })

  it('explains connection problems instead of showing transport messages', () => {
    const error = new ApiError({ kind: 'network', message: 'Network unavailable' })
    expect(applyApiErrorToForm<Form>(error, { setError: vi.fn(), fields })).toBe(CONNECTION_MESSAGE)
  })

  it('hides technical messages', () => {
    const contract = new ApiError({ kind: 'contract', message: 'Response does not match' })
    expect(applyApiErrorToForm<Form>(contract, { setError: vi.fn(), fields })).toBe(GENERIC_MESSAGE)
    expect(applyApiErrorToForm<Form>(new Error('boom'), { setError: vi.fn(), fields })).toBe(
      GENERIC_MESSAGE,
    )
  })
})
