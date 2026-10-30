import { WALLET_PROVIDER_LABEL, WALLET_PROVIDERS } from '@/domain/wallet'
import { cn } from '@/shared/lib/utils'

/** "METAMASK · WALLETCONNECT · COINBASE" pill used in the footer and the payment step. */
export function WalletsBadge({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-sm border border-primary/40 bg-secondary px-2 py-1 text-tiny font-bold tracking-wide text-accent-foreground uppercase',
        className,
      )}
    >
      {WALLET_PROVIDERS.map((provider, index) => (
        <span key={provider} className="contents">
          {index > 0 && <span aria-hidden="true">·</span>}
          <span>{WALLET_PROVIDER_LABEL[provider].replace(' Wallet', '')}</span>
        </span>
      ))}
    </p>
  )
}
