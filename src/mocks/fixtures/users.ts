import type { Wallet } from '@/domain/wallet'

export interface UserRecord {
  id: string
  username: string
  email: string
  displayName: string
  salt: string
  passwordHash: string
  avatarUrl: string | null
  ensLabel: string | null
  walletNickname: string
  cartId: string
  updatedAt: string
}

export interface UserWallets {
  primary: Wallet | null
  secondary: Wallet | null
}

/**
 * Demo credentials (documented in the README). Both use the password `kurio1234`;
 * only its salted hash is stored here.
 */
export const DEMO_PASSWORD = 'kurio1234'

const SEEDED_AT = '2026-10-01T12:00:00.000Z'

export function buildUserFixtures(): UserRecord[] {
  return [
    {
      id: 'user-nova',
      username: 'nova_sato',
      email: 'nova@kurio.art',
      displayName: 'Nova Sato',
      salt: 'nova-salt-01',
      passwordHash: '731e39d734bc969374e2e688bf8ea5a273f2455d2e422d7ad9f8862d5bd9199b',
      avatarUrl: null,
      ensLabel: 'novasato',
      walletNickname: 'Cofre principal',
      cartId: 'cart-user-nova',
      updatedAt: SEEDED_AT,
    },
    {
      id: 'user-kai',
      username: 'kai_moreno',
      email: 'kai@kurio.art',
      displayName: 'Kai Moreno',
      salt: 'kai-salt-02',
      passwordHash: '7dcd5f5410ea320473b79b5bab3cfe6525bcd7bd56d8e1d68d460732de22dbeb',
      avatarUrl: null,
      ensLabel: null,
      walletNickname: 'Carteira do Kai',
      cartId: 'cart-user-kai',
      updatedAt: SEEDED_AT,
    },
  ]
}

// Nova has a primary wallet (checkout works out of the box); Kai starts with none
export function buildWalletFixtures(): Record<string, UserWallets> {
  return {
    'user-nova': {
      primary: {
        id: 'wallet-nova-primary',
        slot: 'primary',
        sameAsPrimary: false,
        displayName: 'Nova Sato',
        nickname: 'Cofre principal',
        network: 'ethereum',
        profileName: 'Nova',
        address: '0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8',
        provider: 'metamask',
        referralCode: 'KURIO2026',
        email: 'nova@kurio.art',
        ensLabel: 'novasato',
        updatedAt: SEEDED_AT,
      },
      secondary: null,
    },
    'user-kai': { primary: null, secondary: null },
  }
}
