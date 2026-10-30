import { z } from 'zod'

import { emailSchema, passwordSchema, usernameSchema } from './validation'

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})

export type User = z.infer<typeof userSchema>

/**
 * Bearer-token session. The token is opaque to the client: it is only stored and sent back.
 * `expiresAt` lets the UI anticipate expiry, but the API's 401 is always the source of truth.
 */
export const sessionSchema = z.object({
  token: z.string(),
  user: userSchema,
  expiresAt: z.iso.datetime(),
})

export type Session = z.infer<typeof sessionSchema>

// GET /session: the token is already known to the caller, so it is not echoed back
export const currentSessionSchema = sessionSchema.omit({ token: true })
export type CurrentSession = z.infer<typeof currentSessionSchema>

export const signInInputSchema = z.object({
  email: emailSchema,
  // Login only checks presence: strength rules apply when the password is created
  password: z.string().min(1, 'Informe a senha'),
})

export type SignInInput = z.infer<typeof signInInputSchema>

export const signUpFormSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((form) => form.password === form.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type SignUpForm = z.infer<typeof signUpFormSchema>

// The confirmation is a UI concern; the API receives the password once
export const signUpInputSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export type SignUpInput = z.infer<typeof signUpInputSchema>

export function toSignUpInput({ username, email, password }: SignUpForm): SignUpInput {
  return { username, email, password }
}

export function isSessionExpired(session: Pick<Session, 'expiresAt'>, now: Date): boolean {
  return new Date(session.expiresAt).getTime() <= now.getTime()
}
