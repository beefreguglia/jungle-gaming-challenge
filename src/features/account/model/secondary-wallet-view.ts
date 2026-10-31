import type { Wallet, Wallets } from '@/domain/wallet'

export interface SecondaryWalletView {
  // Linked to the primary ("Igual à carteira principal")
  same: boolean
  // Show the form, and with which data (own secondary or a copy of the primary)
  form: { initial: Wallet | null } | null
  // Nothing saved and not adding: "Você ainda não adicionou…" + "Adicionar"
  empty: boolean
}

/**
 * What the secondary wallet section shows. `adding` is the user choosing to create one, or
 * to unlink it from the primary (then the form starts from the primary's data).
 */
export function secondaryWalletView(
  { primary, secondary }: Wallets,
  adding: boolean,
): SecondaryWalletView {
  const same = Boolean(secondary?.sameAsPrimary) && !adding
  if (secondary && !secondary.sameAsPrimary)
    return { same, form: { initial: secondary }, empty: false }
  if (adding) return { same, form: { initial: primary }, empty: false }
  return { same, form: null, empty: !secondary }
}
