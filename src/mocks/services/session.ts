import type { CurrentSession, Session, SignInInput, SignUpInput, User } from '@/domain/auth'
import { API_ERROR_CODES } from '@/domain/errors'

import type { Backend } from '../backend'
import type { SessionRecord } from '../db/database'
import type { UserRecord } from '../fixtures/users'
import { fail, MockApiError } from '../lib/errors'
import { createSalt, hashPassword, verifyPassword } from '../lib/password'

export function toUser(record: UserRecord): User {
  const { id, username, email, displayName, avatarUrl } = record
  return { id, username, email, displayName, avatarUrl }
}

function openSession(backend: Backend, user: UserRecord): Session {
  const record: SessionRecord = {
    token: crypto.randomUUID(),
    userId: user.id,
    expiresAt: new Date(backend.now().getTime() + backend.scenario().sessionTtlMs).toISOString(),
  }
  backend.db.state.sessions.push(record)
  backend.db.commit()
  return { token: record.token, user: toUser(user), expiresAt: record.expiresAt }
}

/** Throws 409 with field messages when the email or username belongs to another user. */
export function assertUniqueIdentity(
  backend: Backend,
  identity: { email: string; username: string },
  exceptUserId?: string,
): void {
  const others = backend.db.state.users.filter((user) => user.id !== exceptUserId)
  if (others.some((user) => user.email === identity.email)) {
    throw fail.conflict(API_ERROR_CODES.emailTaken, 'Este e-mail já está cadastrado', {
      email: 'Este e-mail já está cadastrado',
    })
  }
  if (others.some((user) => user.username === identity.username)) {
    throw fail.conflict(API_ERROR_CODES.usernameTaken, 'Este nome de usuário já está em uso', {
      username: 'Este nome de usuário já está em uso',
    })
  }
}

export async function signUp(backend: Backend, input: SignUpInput): Promise<Session> {
  assertUniqueIdentity(backend, input)

  const id = backend.db.nextId('user')
  const salt = createSalt()
  const user: UserRecord = {
    id,
    username: input.username,
    email: input.email,
    displayName: input.username,
    salt,
    passwordHash: await hashPassword(salt, input.password),
    avatarUrl: null,
    ensLabel: null,
    walletNickname: 'Minha carteira',
    cartId: `cart-${id}`,
    updatedAt: backend.now().toISOString(),
  }
  const { state } = backend.db
  state.users.push(user)
  state.carts.push({
    id: user.cartId,
    userId: id,
    items: [],
    couponCode: null,
    updatedAt: user.updatedAt,
  })
  state.favorites[id] = []
  state.wallets[id] = { primary: null, secondary: null }
  return openSession(backend, user)
}

export async function signIn(backend: Backend, input: SignInInput): Promise<Session> {
  const user = backend.db.state.users.find((item) => item.email === input.email)
  // Same answer for unknown email and wrong password: no account enumeration
  if (!user || !(await verifyPassword(user, input.password))) {
    throw new MockApiError({
      status: 401,
      code: API_ERROR_CODES.invalidCredentials,
      message: 'E-mail ou senha incorretos',
    })
  }
  return openSession(backend, user)
}

function bearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer (.+)$/)
  return match?.[1] ?? null
}

function findSession(backend: Backend, authorization: string | null): SessionRecord | null {
  const token = bearerToken(authorization)
  if (!token) return null
  const session = backend.db.state.sessions.find((item) => item.token === token)
  // An unknown token (logged out, reset or forged) is treated as expired: the client had one
  if (!session) throw fail.sessionExpired()
  if (new Date(session.expiresAt).getTime() <= backend.now().getTime()) throw fail.sessionExpired()
  return session
}

/** User behind the request, or null for visitors. A bad token is an error, never a visitor. */
export function optionalUser(backend: Backend, authorization: string | null): UserRecord | null {
  const session = findSession(backend, authorization)
  if (!session) return null
  return backend.db.state.users.find((user) => user.id === session.userId) ?? null
}

export function requireUser(backend: Backend, authorization: string | null): UserRecord {
  const user = optionalUser(backend, authorization)
  if (!user) throw fail.unauthenticated()
  return user
}

export function currentSession(backend: Backend, authorization: string | null): CurrentSession {
  const session = findSession(backend, authorization)
  const user = session && backend.db.state.users.find((item) => item.id === session.userId)
  if (!session || !user) throw fail.unauthenticated()
  return { user: toUser(user), expiresAt: session.expiresAt }
}

export function signOut(backend: Backend, authorization: string | null): void {
  const token = bearerToken(authorization)
  const { state } = backend.db
  state.sessions = state.sessions.filter((session) => session.token !== token)
  backend.db.commit()
}

/** Control hook: every open session expires now (tests "sessão expirada" without waiting). */
export function expireAllSessions(backend: Backend): void {
  const now = backend.now().toISOString()
  for (const session of backend.db.state.sessions) session.expiresAt = now
  backend.db.commit()
}
