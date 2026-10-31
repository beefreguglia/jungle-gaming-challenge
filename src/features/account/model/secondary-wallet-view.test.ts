import { describe, expect, it } from 'vitest'

import type { Wallet } from '@/domain/wallet'

import { secondaryWalletView } from './secondary-wallet-view'

const wallet = (overrides: Partial<Wallet> = {}): Wallet => ({
  id: 'w1',
  slot: 'primary',
  sameAsPrimary: false,
  displayName: 'Nova',
  nickname: 'Cofre',
  network: 'ethereum',
  profileName: 'Nova',
  address: '0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8',
  provider: 'metamask',
  referralCode: 'KURIO2026',
  email: 'nova@kurio.art',
  ensLabel: 'nova',
  updatedAt: '2026-10-01T12:00:00.000Z',
  ...overrides,
})

describe('secondaryWalletView', () => {
  const primary = wallet()

  it('offers to add when there is no secondary', () => {
    expect(secondaryWalletView({ primary, secondary: null }, false)).toEqual({
      same: false,
      form: null,
      empty: true,
    })
  })

  it('shows the own secondary in the form', () => {
    const secondary = wallet({ id: 'w2', slot: 'secondary', nickname: 'Reserva' })
    expect(secondaryWalletView({ primary, secondary }, false).form?.initial).toBe(secondary)
  })

  it('summarizes a linked secondary, and unlinking starts from the primary data', () => {
    const linked = wallet({ id: 'w2', slot: 'secondary', sameAsPrimary: true })
    expect(secondaryWalletView({ primary, secondary: linked }, false)).toEqual({
      same: true,
      form: null,
      empty: false,
    })
    expect(secondaryWalletView({ primary, secondary: linked }, true).form?.initial).toBe(primary)
  })
})
