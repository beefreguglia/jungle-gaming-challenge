import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import type { Session, SignInInput, SignUpInput } from '@/domain/auth'
import { useSessionManager } from '@/features/session'

/*
 * Feedback lives inside the mutation functions: a session change purges the mutation cache
 * (private data), so callbacks registered on the mutation could be dropped with it.
 */

function welcome(session: Session, verb: 'back' | 'new'): void {
  const name = session.user.displayName
  toast.success(verb === 'new' ? `Conta criada. Boas-vindas, ${name}!` : `Olá de novo, ${name}!`)
}

export function useSignIn() {
  const session = useSessionManager()
  return useMutation({
    mutationFn: async (input: SignInInput) => {
      const result = await session.signIn(input)
      welcome(result, 'back')
      return result
    },
  })
}

export function useSignUp() {
  const session = useSessionManager()
  return useMutation({
    mutationFn: async (input: SignUpInput) => {
      const result = await session.signUp(input)
      welcome(result, 'new')
      return result
    },
  })
}

/** Leaves private pages first, so ending the session does not bounce the user to /login. */
export function useLogout() {
  const session = useSessionManager()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async () => {
      await navigate({ to: '/' })
      await session.logout()
      toast.success('Você saiu da sua conta')
    },
  })
}
