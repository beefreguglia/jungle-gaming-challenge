import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'

import type { CheckoutDetails } from '@/domain/order'
import type { WalletConnection } from '@/domain/wallet'
import { applyApiErrorToForm } from '@/shared/lib/form-errors'

import { useConnectWallet, useDisconnectWallet } from '../api/wallet-connection'
import { CHECKOUT_FIELDS, type CheckoutValues } from '../model/checkout-values'

type Form = UseFormReturn<CheckoutValues, unknown, CheckoutDetails>

/**
 * Simulated wallet connection for the payment. It is only "live" while it still matches
 * the provider, network and address on the form; editing any of them requires reconnecting.
 */
export function useCheckoutConnection(
  form: Pick<Form, 'trigger' | 'getValues' | 'setError'>,
  current: Pick<CheckoutValues, 'provider' | 'network' | 'address'>,
  initial: WalletConnection | null,
) {
  const [connection, setConnection] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const connect = useConnectWallet()
  const disconnect = useDisconnectWallet()

  const live =
    connection &&
    connection.provider === current.provider &&
    connection.network === current.network &&
    connection.address === current.address.trim()
      ? connection
      : null

  async function open() {
    setError(null)
    const valid = await form.trigger(['network', 'address', 'provider'], { shouldFocus: true })
    if (!valid) return
    const { provider, network, address } = form.getValues()
    // Replacing a connection: the previous one is released on the API
    if (connection) disconnect.mutate(connection.id)
    connect.mutate(
      { provider, network, address: address.trim() },
      {
        // The panel's status line announces the connection; no toast needed
        onSuccess: setConnection,
        onError: (failure) => {
          setConnection(null)
          // Refusal (403 wallet_rejected) shows here; an invalid field goes to the field
          setError(
            applyApiErrorToForm(failure, { setError: form.setError, fields: CHECKOUT_FIELDS }),
          )
        },
      },
    )
  }

  function close() {
    if (!connection) return
    disconnect.mutate(connection.id)
    setConnection(null)
    toast('Carteira desconectada')
  }

  /** The API no longer knows the connection (expired, reset): ask for a new one. */
  function invalidate(message: string) {
    setConnection(null)
    setError(message)
  }

  return {
    connection,
    live,
    stale: connection !== null && live === null,
    connecting: connect.isPending,
    error,
    setError,
    open,
    close,
    invalidate,
  }
}
