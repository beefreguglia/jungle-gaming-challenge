import { API_ERROR_CODES } from '@/domain/errors'
import {
  AVATAR_PROBLEM_MESSAGE,
  avatarProblem,
  type ChangePasswordInput,
  type Profile,
  type ProfileInput,
} from '@/domain/profile'
import type {
  SecondaryWalletInput,
  Wallet,
  WalletInput,
  Wallets,
  WalletSlot,
} from '@/domain/wallet'

import type { Backend } from '../backend'
import type { UserRecord } from '../fixtures/users'
import { fail } from '../lib/errors'
import { createSalt, hashPassword, verifyPassword } from '../lib/password'
import { assertUniqueIdentity } from './session'

export function toProfile(user: UserRecord): Profile {
  const { displayName, username, email, ensLabel, walletNickname, avatarUrl, updatedAt } = user
  return { displayName, username, email, ensLabel, walletNickname, avatarUrl, updatedAt }
}

export function updateProfile(backend: Backend, user: UserRecord, input: ProfileInput): Profile {
  assertUniqueIdentity(backend, input, user.id)
  Object.assign(user, input, { updatedAt: backend.now().toISOString() })
  backend.db.commit()
  return toProfile(user)
}

export async function changePassword(
  backend: Backend,
  user: UserRecord,
  input: ChangePasswordInput,
): Promise<void> {
  if (!(await verifyPassword(user, input.currentPassword))) {
    throw fail.unprocessable(API_ERROR_CODES.wrongPassword, 'Senha atual incorreta', {
      currentPassword: 'Senha atual incorreta',
    })
  }
  user.salt = createSalt()
  user.passwordHash = await hashPassword(user.salt, input.newPassword)
  user.updatedAt = backend.now().toISOString()
  backend.db.commit()
}

export function assertAvatar(file: { type: string; size: number }): void {
  const problem = avatarProblem(file)
  if (problem) throw fail.validation({ avatar: AVATAR_PROBLEM_MESSAGE[problem] })
}

export function setAvatar(
  backend: Backend,
  user: UserRecord,
  avatar: { type: string; size: number; dataUrl: string } | null,
): Profile {
  if (avatar) assertAvatar(avatar)
  user.avatarUrl = avatar?.dataUrl ?? null
  user.updatedAt = backend.now().toISOString()
  backend.db.commit()
  return toProfile(user)
}

// --- Wallets --------------------------------------------------------------------------------

export function getWallets(backend: Backend, user: UserRecord): Wallets {
  return backend.db.state.wallets[user.id] ?? { primary: null, secondary: null }
}

function upsertWallet(
  backend: Backend,
  user: UserRecord,
  { slot, data }: { slot: WalletSlot; data: WalletInput & { sameAsPrimary: boolean } },
): Wallet {
  const wallets = getWallets(backend, user)
  const wallet: Wallet = {
    ...data,
    id: wallets[slot]?.id ?? backend.db.nextId(`wallet-${slot}`),
    slot,
    updatedAt: backend.now().toISOString(),
  }
  backend.db.state.wallets[user.id] = { ...wallets, [slot]: wallet }
  backend.db.commit()
  return wallet
}

export function savePrimaryWallet(backend: Backend, user: UserRecord, input: WalletInput): Wallet {
  const wallet = upsertWallet(backend, user, {
    slot: 'primary',
    data: { ...input, sameAsPrimary: false },
  })
  // A secondary wallet linked to the primary follows its changes
  const { secondary } = getWallets(backend, user)
  if (secondary?.sameAsPrimary) {
    upsertWallet(backend, user, {
      slot: 'secondary',
      data: { ...stripWallet(wallet), sameAsPrimary: true },
    })
  }
  return wallet
}

export function saveSecondaryWallet(
  backend: Backend,
  user: UserRecord,
  input: SecondaryWalletInput,
): Wallet {
  if (!('sameAsPrimary' in input)) {
    return upsertWallet(backend, user, {
      slot: 'secondary',
      data: { ...input, sameAsPrimary: false },
    })
  }
  const { primary } = getWallets(backend, user)
  if (!primary) {
    throw fail.conflict(API_ERROR_CODES.validation, 'Cadastre a carteira principal primeiro')
  }
  return upsertWallet(backend, user, {
    slot: 'secondary',
    data: { ...stripWallet(primary), sameAsPrimary: true },
  })
}

function stripWallet({
  id: _id,
  slot: _slot,
  sameAsPrimary: _same,
  updatedAt: _at,
  ...input
}: Wallet) {
  return input
}
