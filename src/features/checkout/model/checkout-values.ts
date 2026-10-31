import type { z } from 'zod'

import type { checkoutDetailsSchema } from '@/domain/order'
import type { Profile } from '@/domain/profile'
import type { Wallet, Wallets } from '@/domain/wallet'

import type { CheckoutDraft } from './checkout-storage'

export type CheckoutValues = z.input<typeof checkoutDetailsSchema>

export const CHECKOUT_FIELDS = [
  'displayName',
  'username',
  'network',
  'profileName',
  'address',
  'alternateAddress',
  'provider',
  'referralCode',
  'email',
  'ensLabel',
  'note',
] as const

// Filled from a registered wallet, cleared for "Usar outra carteira"
export const WALLET_FIELDS = [
  'network',
  'profileName',
  'address',
  'alternateAddress',
  'provider',
  'referralCode',
  'ensLabel',
] as const

type WalletFields = Pick<CheckoutValues, (typeof WALLET_FIELDS)[number]>

// Selects start empty, as in the Figma ("Selecione uma rede")
const NO_WALLET: WalletFields = {
  network: '' as CheckoutValues['network'],
  profileName: '',
  address: '',
  alternateAddress: '',
  provider: '' as CheckoutValues['provider'],
  referralCode: '',
  ensLabel: '',
}

export function walletFields(wallet: Wallet | null): WalletFields {
  if (!wallet) return NO_WALLET
  const { network, profileName, address, alternateAddress, provider, referralCode, ensLabel } =
    wallet
  return {
    network,
    profileName,
    address,
    alternateAddress: alternateAddress ?? '',
    provider,
    referralCode,
    ensLabel,
  }
}

/** Registered wallets offered at checkout; a secondary that mirrors the primary is skipped. */
export function registeredWallets({ primary, secondary }: Wallets): Wallet[] {
  return [primary, secondary?.sameAsPrimary ? null : secondary].filter(
    (wallet): wallet is Wallet => wallet !== null,
  )
}

/** Profile and chosen wallet first; a saved draft (reload, re-login) wins over both. */
export function initialCheckoutValues(
  profile: Profile,
  wallet: Wallet | null,
  draft: CheckoutDraft | null,
): CheckoutValues {
  const values: CheckoutValues = {
    displayName: wallet?.displayName ?? profile.displayName,
    username: profile.username,
    email: wallet?.email ?? profile.email,
    note: '',
    ...walletFields(wallet),
  }
  for (const field of CHECKOUT_FIELDS) {
    const saved = draft?.values[field]
    if (saved !== undefined) Object.assign(values, { [field]: saved })
  }
  return values
}

export function toDraftValues(values: Partial<CheckoutValues>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}
