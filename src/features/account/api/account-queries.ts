import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { API_PATHS } from '@/domain/api-contract'
import {
  type ChangePasswordInput,
  type Profile,
  type ProfileInput,
  profileSchema,
} from '@/domain/profile'
import {
  type SecondaryWalletInput,
  type Wallet,
  type WalletInput,
  walletSchema,
  walletsSchema,
} from '@/domain/wallet'
import { useSession, useSessionManager, userKey } from '@/features/session'
import { type HttpClient, useHttpClient } from '@/shared/api'

const profileKey = (userId: string) => userKey(userId, 'profile')
const walletsKey = (userId: string) => userKey(userId, 'wallets')

function useUserId(): string {
  const { session } = useSession()
  // Account pages live under the _authenticated guard, so a session is always there
  return session?.user.id ?? ''
}

export function profileQueryOptions(http: HttpClient, userId: string) {
  return queryOptions({
    queryKey: profileKey(userId),
    queryFn: ({ signal }) => http.get(API_PATHS.profile, { schema: profileSchema, signal }),
  })
}

export function walletsQueryOptions(http: HttpClient, userId: string) {
  return queryOptions({
    queryKey: walletsKey(userId),
    queryFn: ({ signal }) => http.get(API_PATHS.wallets, { schema: walletsSchema, signal }),
  })
}

export function useProfile() {
  return useQuery(profileQueryOptions(useHttpClient(), useUserId()))
}

export function useWallets() {
  return useQuery(walletsQueryOptions(useHttpClient(), useUserId()))
}

/**
 * Profile writes return the new profile; the session is revalidated too, so the header
 * shows the new name and avatar right away.
 */
function useProfileWrite<Input>(write: (input: Input) => Promise<Profile>) {
  const queryClient = useQueryClient()
  const session = useSessionManager()
  const userId = useUserId()
  return useMutation({
    mutationFn: write,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey(userId), profile)
      void session.validate()
    },
  })
}

export function useUpdateProfile() {
  const http = useHttpClient()
  return useProfileWrite((input: ProfileInput) =>
    http.patch<Profile>(API_PATHS.profile, input, { schema: profileSchema }),
  )
}

export function useUploadAvatar() {
  const http = useHttpClient()
  return useProfileWrite((file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return http.put<Profile>(API_PATHS.profileAvatar, form, { schema: profileSchema })
  })
}

export function useRemoveAvatar() {
  const http = useHttpClient()
  return useProfileWrite(() =>
    http.delete<Profile>(API_PATHS.profileAvatar, { schema: profileSchema }),
  )
}

export function useChangePassword() {
  const http = useHttpClient()
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => http.put<void>(API_PATHS.profilePassword, input),
  })
}

function useWalletWrite<Input>(write: (input: Input) => Promise<Wallet>) {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: write,
    // A primary change can also move a secondary linked to it: reload both
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletsKey(userId) }),
  })
}

export function useSavePrimaryWallet() {
  const http = useHttpClient()
  return useWalletWrite((input: WalletInput) =>
    http.put<Wallet>(API_PATHS.wallet('primary'), input, { schema: walletSchema }),
  )
}

export function useSaveSecondaryWallet() {
  const http = useHttpClient()
  return useWalletWrite((input: SecondaryWalletInput) =>
    http.put<Wallet>(API_PATHS.wallet('secondary'), input, { schema: walletSchema }),
  )
}
