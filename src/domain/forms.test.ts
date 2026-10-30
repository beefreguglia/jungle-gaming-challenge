import { describe, expect, it } from 'vitest'

import { signUpFormSchema } from './auth'
import { toggleFavorite } from './favorites'
import { avatarProblem, passwordFormSchema } from './profile'
import { isValidWalletAddress, shortenHash } from './validation'
import { secondaryWalletInputSchema, walletConnectionInputSchema } from './wallet'

// First message per field, which is what the form displays
function messages(result: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  const byField: Record<string, string> = {}
  for (const issue of result.error?.issues ?? []) {
    byField[issue.path.join('.')] ??= issue.message
  }
  return byField
}

describe('signUpFormSchema', () => {
  it('reports each invalid field in pt-BR', () => {
    const result = signUpFormSchema.safeParse({
      username: 'Nova Sato',
      email: 'nova@',
      password: 'curta',
      confirmPassword: 'outra',
    })
    expect(messages(result)).toMatchObject({
      username: 'Use apenas letras minúsculas, números e _',
      email: 'E-mail inválido',
      password: 'A senha precisa de pelo menos 8 caracteres',
    })
  })

  it('requires matching passwords', () => {
    const result = signUpFormSchema.safeParse({
      username: 'nova',
      email: 'nova@example.com',
      password: 'segredo123',
      confirmPassword: 'segredo124',
    })
    expect(messages(result)).toEqual({ confirmPassword: 'As senhas não coincidem' })
  })
})

describe('passwordFormSchema', () => {
  it('rejects reusing the current password', () => {
    const result = passwordFormSchema.safeParse({
      currentPassword: 'segredo123',
      newPassword: 'segredo123',
      confirmPassword: 'segredo123',
    })
    expect(messages(result)).toEqual({ newPassword: 'A nova senha deve ser diferente da atual' })
  })
})

describe('wallet addresses', () => {
  it('validates per network', () => {
    const evm = '0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8'
    expect(isValidWalletAddress('ethereum', evm)).toBe(true)
    expect(isValidWalletAddress('polygon', evm)).toBe(true)
    expect(isValidWalletAddress('solana', evm)).toBe(false)
    expect(isValidWalletAddress('solana', '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV')).toBe(true)
  })

  it('rejects a wallet connection whose address does not fit the network', () => {
    const connection = {
      provider: 'coinbase',
      network: 'solana',
      address: '0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8',
    }
    expect(walletConnectionInputSchema.safeParse(connection).success).toBe(false)
  })

  it('accepts a secondary wallet linked to the primary', () => {
    expect(secondaryWalletInputSchema.safeParse({ sameAsPrimary: true }).success).toBe(true)
  })

  it('shortens hashes for display', () => {
    expect(shortenHash('0xA91F00000000000000000000000000000000E82C')).toBe('0xA91F…E82C')
  })
})

describe('avatarProblem', () => {
  it('checks type and size', () => {
    expect(avatarProblem({ type: 'image/png', size: 1000 })).toBeNull()
    expect(avatarProblem({ type: 'image/gif', size: 1000 })).toBe('type')
    expect(avatarProblem({ type: 'image/webp', size: 3 * 1024 * 1024 })).toBe('size')
  })
})

describe('toggleFavorite', () => {
  it('adds and removes ids', () => {
    expect(toggleFavorite({ nftIds: ['a'] }, 'b')).toEqual({ nftIds: ['a', 'b'] })
    expect(toggleFavorite({ nftIds: ['a', 'b'] }, 'a')).toEqual({ nftIds: ['b'] })
  })
})
