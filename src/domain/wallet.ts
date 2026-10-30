import { z } from 'zod'

import { nftNetworkSchema } from './nft'
import {
  emailSchema,
  ensLabelSchema,
  isValidWalletAddress,
  requiredText,
  WALLET_ADDRESS_MESSAGE,
} from './validation'

export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletProviderSchema = z.enum(WALLET_PROVIDERS)
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const WALLET_PROVIDER_LABEL: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const WALLET_SLOTS = ['primary', 'secondary'] as const
export const walletSlotSchema = z.enum(WALLET_SLOTS)
export type WalletSlot = z.infer<typeof walletSlotSchema>

/**
 * Fields from the "Carteiras" and "Pagamento" frames. Required markers follow the layout,
 * including the referral code, which the Figma marks as mandatory.
 */
export const walletFieldsSchema = z.object({
  displayName: requiredText(),
  nickname: requiredText(40),
  network: nftNetworkSchema,
  profileName: requiredText(),
  address: z.string().trim().min(1, 'Informe o endereço da carteira'),
  // "ENS ou carteira secundária (opcional)"
  alternateAddress: z.string().trim().max(100).optional(),
  provider: walletProviderSchema,
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,16}$/, 'Código de indicação inválido (4 a 16 letras ou números)'),
  email: emailSchema,
  ensLabel: ensLabelSchema,
})

/** Cross-field rule: the address format depends on the selected network. */
export function refineWalletAddress(
  wallet: Pick<z.infer<typeof walletFieldsSchema>, 'network' | 'address'>,
  ctx: z.RefinementCtx,
): void {
  if (!isValidWalletAddress(wallet.network, wallet.address)) {
    ctx.addIssue({
      code: 'custom',
      path: ['address'],
      message: WALLET_ADDRESS_MESSAGE[wallet.network],
    })
  }
}

export const walletInputSchema = walletFieldsSchema.superRefine(refineWalletAddress)

export type WalletInput = z.infer<typeof walletInputSchema>

export const walletSchema = walletFieldsSchema.extend({
  id: z.string(),
  slot: walletSlotSchema,
  // Secondary wallet mirroring the primary one ("Igual à carteira principal")
  sameAsPrimary: z.boolean(),
  updatedAt: z.iso.datetime(),
})

export type Wallet = z.infer<typeof walletSchema>

export const walletsSchema = z.object({
  primary: walletSchema.nullable(),
  secondary: walletSchema.nullable(),
})

export type Wallets = z.infer<typeof walletsSchema>

// PUT /wallets/secondary accepts either its own data or a link to the primary wallet
export const secondaryWalletInputSchema = z.union([
  z.object({ sameAsPrimary: z.literal(true) }),
  walletInputSchema,
])

export type SecondaryWalletInput = z.infer<typeof secondaryWalletInputSchema>

export function ensName(label: string): string {
  return `${label}.eth`
}

// --- Simulated wallet connection (checkout) -------------------------------------------------

// POST /wallet-connections may be refused (403 `wallet_rejected`); DELETE disconnects
const walletConnectionFieldsSchema = z.object({
  provider: walletProviderSchema,
  network: nftNetworkSchema,
  address: z.string().trim(),
})

export const walletConnectionInputSchema =
  walletConnectionFieldsSchema.superRefine(refineWalletAddress)

// Refined schemas cannot be extended, so the response builds on the plain fields
export const walletConnectionSchema = walletConnectionFieldsSchema.extend({
  id: z.string(),
  connectedAt: z.iso.datetime(),
})

export type WalletConnectionInput = z.infer<typeof walletConnectionInputSchema>
export type WalletConnection = z.infer<typeof walletConnectionSchema>

/** Wallets usable at checkout for a given network, primary first. */
export function walletsForNetwork(wallets: Wallets, network: Wallet['network']): Wallet[] {
  return [wallets.primary, wallets.secondary].filter(
    (wallet): wallet is Wallet => wallet !== null && wallet.network === network,
  )
}
