import { describe, expect, it } from 'vitest'

import { DEMO_PASSWORD } from '../fixtures/users'
import { createTestBackend } from '../testing'
import { changePassword, updateProfile } from './account'
import { currentSession, expireAllSessions, optionalUser, signIn, signUp } from './session'

describe('session', () => {
  it('signs in with the demo credentials and never stores the password', async () => {
    const { backend } = createTestBackend()
    const session = await signIn(backend, { email: 'nova@kurio.art', password: DEMO_PASSWORD })
    expect(session.user.username).toBe('nova_sato')
    expect(JSON.stringify(backend.db.state)).not.toContain(DEMO_PASSWORD)
  })

  it('answers the same way for unknown email and wrong password', async () => {
    const { backend } = createTestBackend()
    const expected = { status: 401, code: 'invalid_credentials' }
    await expect(
      signIn(backend, { email: 'nova@kurio.art', password: 'errada123' }),
    ).rejects.toMatchObject(expected)
    await expect(
      signIn(backend, { email: 'ninguem@kurio.art', password: DEMO_PASSWORD }),
    ).rejects.toMatchObject(expected)
  })

  it('reports sign-up conflicts per field', async () => {
    const { backend } = createTestBackend()
    await expect(
      signUp(backend, { username: 'nova2', email: 'nova@kurio.art', password: 'segredo123' }),
    ).rejects.toMatchObject({ status: 409, fields: { email: 'Este e-mail já está cadastrado' } })
  })

  it('expires sessions: a bad token is an error, not a visitor', async () => {
    const { backend } = createTestBackend()
    const { token } = await signIn(backend, { email: 'kai@kurio.art', password: DEMO_PASSWORD })
    expect(currentSession(backend, `Bearer ${token}`).user.id).toBe('user-kai')

    expireAllSessions(backend)

    expect(() => optionalUser(backend, `Bearer ${token}`)).toThrow(
      expect.objectContaining({ code: 'session_expired' }),
    )
    expect(optionalUser(backend, null)).toBeNull()
  })
})

describe('account', () => {
  it('changes the password only with the current one', async () => {
    const { backend } = createTestBackend()
    const nova = backend.db.state.users[0]!
    await expect(
      changePassword(backend, nova, { currentPassword: 'errada', newPassword: 'novasenha1' }),
    ).rejects.toMatchObject({ code: 'wrong_password' })

    await changePassword(backend, nova, {
      currentPassword: DEMO_PASSWORD,
      newPassword: 'novasenha1',
    })
    await expect(
      signIn(backend, { email: 'nova@kurio.art', password: 'novasenha1' }),
    ).resolves.toBeTruthy()
  })

  it('rejects a profile email owned by someone else', () => {
    const { backend } = createTestBackend()
    const nova = backend.db.state.users[0]!
    expect(() =>
      updateProfile(backend, nova, {
        displayName: 'Nova',
        username: 'nova_sato',
        email: 'kai@kurio.art',
        ensLabel: 'nova',
        walletNickname: 'Cofre',
      }),
    ).toThrow(expect.objectContaining({ code: 'email_taken' }))
  })
})
