import { useMutation } from '@tanstack/react-query'

import { API_PATHS } from '@/domain/api-contract'
import { type WalletConnectionInput, walletConnectionSchema } from '@/domain/wallet'
import { useHttpClient } from '@/shared/api'

/** Simulated wallet handshake: the API may refuse it (403 `wallet_rejected`). */
export function useConnectWallet() {
  const http = useHttpClient()
  return useMutation({
    mutationFn: (input: WalletConnectionInput) =>
      http.post(API_PATHS.walletConnections, input, { schema: walletConnectionSchema }),
  })
}

export function useDisconnectWallet() {
  const http = useHttpClient()
  return useMutation({
    mutationFn: (connectionId: string) =>
      http.delete<void>(API_PATHS.walletConnection(connectionId)),
  })
}
