import { z } from 'zod'

import type { NftNetwork } from './nft'

/**
 * Field rules shared by forms (react-hook-form resolvers) and the mock API, so the client
 * and the simulated server reject exactly the same input. Messages are user-facing (pt-BR).
 */

export const requiredText = (max = 80) =>
  z.string().trim().min(1, 'Campo obrigatório').max(max, `Use no máximo ${max} caracteres`)

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail')
  .pipe(z.email('E-mail inválido'))
  .transform((email) => email.toLowerCase())

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use pelo menos 3 caracteres')
  .max(20, 'Use no máximo 20 caracteres')
  .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e _')

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .max(72, 'Use no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'A senha precisa de pelo menos uma letra')
  .regex(/\d/, 'A senha precisa de pelo menos um número')

// Label part only; the ".eth" suffix is fixed by the UI select
export const ensLabelSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Use pelo menos 3 caracteres')
  .max(63, 'Use no máximo 63 caracteres')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use letras, números e hífens')

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** Address format depends on the network: EVM chains share 0x addresses, Solana uses base58. */
export function isValidWalletAddress(network: NftNetwork, address: string): boolean {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

export const WALLET_ADDRESS_MESSAGE: Record<NftNetwork, string> = {
  ethereum: 'Endereço Ethereum inválido (0x + 40 caracteres hexadecimais)',
  polygon: 'Endereço Polygon inválido (0x + 40 caracteres hexadecimais)',
  solana: 'Endereço Solana inválido',
}

/** "0x7A42c1…19E8" style shortening for addresses and transaction hashes. */
export function shortenHash(value: string, { head = 6, tail = 4 } = {}): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`
}
