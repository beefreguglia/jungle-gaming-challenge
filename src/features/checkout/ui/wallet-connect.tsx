import { CircleCheckIcon, WalletIcon } from 'lucide-react'
import { useId } from 'react'
import type * as React from 'react'

import { shortenHash } from '@/domain/validation'
import {
  WALLET_PROVIDER_LABEL,
  WALLET_PROVIDERS,
  type WalletConnection,
  type WalletProvider,
} from '@/domain/wallet'
import { NETWORK_LABEL } from '@/features/catalog'
import { Button } from '@/shared/ui/button'
import { FormAlert } from '@/shared/ui/form-alert'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'

interface WalletConnectProps {
  provider: string
  onProviderChange: (provider: WalletProvider) => void
  providerError?: string
  // The live connection, only when it still matches the provider, network and address
  connection: WalletConnection | null
  // A connection exists but the fields changed since: it must be redone
  stale: boolean
  connecting: boolean
  error: string | null
  onConnect: () => void
  onDisconnect: () => void
  connectRef: React.Ref<HTMLButtonElement>
}

/**
 * "Carteira e rede": the wallet app (Figma options) and the simulated connection, which
 * the API may refuse. The order can only be sent through a live, matching connection.
 */
export function WalletConnect({
  provider,
  onProviderChange,
  providerError,
  connection,
  stale,
  connecting,
  error,
  onConnect,
  onDisconnect,
  connectRef,
}: WalletConnectProps) {
  const headingId = useId()
  const errorId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-16 font-bold md:text-center">
        Carteira e rede
      </h2>
      <RadioGroup
        aria-labelledby={headingId}
        aria-required="true"
        aria-invalid={providerError ? true : undefined}
        aria-describedby={providerError ? errorId : undefined}
        value={provider}
        onValueChange={(value) => onProviderChange(value as WalletProvider)}
        className="gap-3"
      >
        {WALLET_PROVIDERS.map((option) => (
          <label
            key={option}
            className="flex min-h-14 cursor-pointer items-center gap-4 rounded-sm border border-border-soft bg-card px-4 has-data-checked:border-primary"
          >
            <RadioGroupItem value={option} />
            <WalletIcon className="size-5 text-accent-foreground" aria-hidden="true" />
            <span className="text-15">{WALLET_PROVIDER_LABEL[option]}</span>
          </label>
        ))}
      </RadioGroup>
      {providerError && (
        <p id={errorId} className="text-caption text-destructive">
          {providerError}
        </p>
      )}

      <FormAlert message={error} />
      {connection ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-success/50 bg-success/10 px-4 py-3"
        >
          <p className="flex min-w-0 items-start gap-2 text-14">
            <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="min-w-0">
              <span className="font-bold">
                {WALLET_PROVIDER_LABEL[connection.provider]} conectada
              </span>
              <span className="block truncate text-subtle">
                {shortenHash(connection.address)} · {NETWORK_LABEL[connection.network]}
              </span>
            </span>
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onDisconnect}>
            Desconectar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {stale && (
            <p role="status" className="text-14 text-accent-foreground">
              Os dados da carteira mudaram. Conecte novamente para confirmar.
            </p>
          )}
          <Button
            ref={connectRef}
            type="button"
            variant="outline"
            disabled={connecting}
            onClick={onConnect}
            className="w-full"
          >
            {connecting ? 'Aguardando a carteira…' : 'Conectar carteira'}
          </Button>
        </div>
      )}
    </section>
  )
}
