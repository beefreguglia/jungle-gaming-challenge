import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

import { AUTH_PARAM, type AuthMode, type AuthSearch } from '../model/auth-route'

/**
 * Opens the sign-in dialog over the current page. `redirect` is where to go once signed
 * in; without it the user stays where they are.
 */
export function useOpenAuth() {
  const navigate = useNavigate()
  return useCallback(
    (options: { mode?: AuthMode; redirect?: string } = {}) =>
      void navigate({
        to: '.',
        search: (previous: AuthSearch) => ({
          ...previous,
          auth: AUTH_PARAM[options.mode ?? 'sign-in'],
          redirect: options.redirect,
        }),
      }),
    [navigate],
  )
}
