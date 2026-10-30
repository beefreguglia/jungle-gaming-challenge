import { HttpResponse } from 'msw'

import { API_PATHS } from '@/domain/api-contract'
import { changePasswordInputSchema, profileInputSchema } from '@/domain/profile'
import { secondaryWalletInputSchema, walletInputSchema } from '@/domain/wallet'

import { fail, parseInput } from '../lib/errors'
import { avatarDataUrl } from '../lib/image'
import type { RouteFn } from '../lib/route'
import {
  assertAvatar,
  changePassword,
  getWallets,
  saveSecondaryWallet,
  savePrimaryWallet,
  setAvatar,
  toProfile,
  updateProfile,
} from '../services/account'
import { requireUser } from '../services/session'

async function readAvatar(request: Request) {
  const form = await request.formData().catch(() => null)
  const file = form?.get('avatar')
  if (!(file instanceof Blob)) throw fail.validation({ avatar: 'Selecione uma imagem' })
  return { type: file.type, size: file.size, file }
}

export const accountHandlers = (route: RouteFn) => [
  route('get', API_PATHS.profile, ({ backend, authorization }) =>
    HttpResponse.json(toProfile(requireUser(backend, authorization))),
  ),

  route('patch', API_PATHS.profile, async ({ backend, authorization, body }) => {
    const user = requireUser(backend, authorization)
    return HttpResponse.json(
      updateProfile(backend, user, parseInput(profileInputSchema, await body())),
    )
  }),

  route('put', API_PATHS.profileAvatar, async ({ backend, authorization, request }) => {
    const user = requireUser(backend, authorization)
    const { type, size, file } = await readAvatar(request)
    // Validate before the (slow) resize so a bad file fails fast
    assertAvatar({ type, size })
    const dataUrl = await avatarDataUrl(file)
    return HttpResponse.json(setAvatar(backend, user, { type, size, dataUrl }))
  }),

  route('delete', API_PATHS.profileAvatar, ({ backend, authorization }) =>
    HttpResponse.json(setAvatar(backend, requireUser(backend, authorization), null)),
  ),

  route('put', API_PATHS.profilePassword, async ({ backend, authorization, body }) => {
    const user = requireUser(backend, authorization)
    await changePassword(backend, user, parseInput(changePasswordInputSchema, await body()))
    return new HttpResponse(null, { status: 204 })
  }),

  route('get', API_PATHS.wallets, ({ backend, authorization }) =>
    HttpResponse.json(getWallets(backend, requireUser(backend, authorization))),
  ),

  route('put', API_PATHS.wallet('primary'), async ({ backend, authorization, body }) => {
    const user = requireUser(backend, authorization)
    return HttpResponse.json(
      savePrimaryWallet(backend, user, parseInput(walletInputSchema, await body())),
    )
  }),

  route('put', API_PATHS.wallet('secondary'), async ({ backend, authorization, body }) => {
    const user = requireUser(backend, authorization)
    const input = parseInput(secondaryWalletInputSchema, await body())
    return HttpResponse.json(saveSecondaryWallet(backend, user, input))
  }),
]
