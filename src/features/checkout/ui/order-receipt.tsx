import { Link } from '@tanstack/react-router'
import { MailOpenIcon, XIcon } from 'lucide-react'
import type * as React from 'react'

import { isEqualEth, formatEth } from '@/domain/money'
import type { NftNetwork } from '@/domain/nft'
import type { Order } from '@/domain/order'
import { shortenHash } from '@/domain/validation'
import { WALLET_PROVIDER_LABEL } from '@/domain/wallet'
import { NETWORK_LABEL } from '@/features/catalog'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { SummaryRow } from '@/shared/ui/summary-row'

import { OrderLines } from './order-lines'

const EXPLORER_NAME: Record<NftNetwork, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}

// "30 out. 2026": the Figma's compact "29 Jul, 2026" in Portuguese
function formatDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('day')} ${part('month')} ${part('year')}`
}

function Meta({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 md:px-4 md:first:pl-0 md:last:pr-0">
      <dt className="text-13 font-bold whitespace-nowrap text-accent-foreground">{term}</dt>
      <dd className="truncate text-14">{children}</dd>
    </div>
  )
}

const shellClass = 'mx-auto w-full max-w-[36.125rem] overflow-hidden rounded-sm bg-card'

export function OrderReceiptSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando o recibo" className={shellClass}>
      <Skeleton className="h-[34rem] w-full" />
    </div>
  )
}

/**
 * Figma "Order Confirmation Modal" as the confirmed order's page: everything comes from
 * the order snapshot, so later catalog changes never alter the receipt. The transaction
 * and explorer link are simulated by the mock API.
 */
export function OrderReceipt({ order }: { order: Order }) {
  const { transaction } = order
  return (
    <article aria-labelledby="receipt-heading" className={`relative ${shellClass}`}>
      <Link
        to="/"
        aria-label="Fechar recibo e voltar ao início"
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-accent-foreground hover:bg-secondary"
      >
        <XIcon className="size-5" aria-hidden="true" />
      </Link>
      <header className="flex flex-col items-center gap-4 px-12 pt-6 pb-5 text-center">
        <MailOpenIcon
          className="size-16 text-accent-foreground"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <h1 id="receipt-heading" className="text-15 font-bold text-accent-foreground md:text-16">
          Seus NFTs agora estão na sua carteira
        </h1>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-primary px-6 py-3 md:flex md:justify-between md:divide-x md:divide-primary md:px-9">
        <Meta term="ID da transação">
          <span title={transaction?.hash}>{transaction ? shortenHash(transaction.hash) : '—'}</span>
        </Meta>
        <Meta term="Data">{formatDate(order.updatedAt)}</Meta>
        <Meta term="Total">{formatEth(order.total)}</Meta>
        <Meta term="Carteira">{WALLET_PROVIDER_LABEL[order.wallet.provider]}</Meta>
      </dl>

      <section aria-labelledby="receipt-details" className="flex flex-col gap-4 px-6 py-5 md:px-11">
        <h2 id="receipt-details" className="text-14 font-bold md:text-15">
          Detalhes da transação
        </h2>
        <OrderLines lines={order.lines} label="NFTs comprados" plain />
        <dl className="flex flex-col gap-2 md:ml-auto md:w-[20rem]">
          {!isEqualEth(order.discount, '0') && (
            <>
              <SummaryRow term="Subtotal">{formatEth(order.subtotal)}</SummaryRow>
              <SummaryRow term={order.couponCode ? `Desconto (${order.couponCode})` : 'Desconto'}>
                (-) {formatEth(order.discount)}
              </SummaryRow>
            </>
          )}
          <SummaryRow term="Taxa de rede">{formatEth(order.networkFee)}</SummaryRow>
          <SummaryRow term="Total" strong>
            {formatEth(order.total)}
          </SummaryRow>
        </dl>
        <p className="border-t border-border pt-4 text-center text-13 text-accent-foreground">
          Transação confirmada na {NETWORK_LABEL[order.network]}. A propriedade foi transferida para
          sua carteira conectada e registrada na rede.
        </p>
        {transaction && (
          <Button asChild className="self-center px-4">
            <a href={transaction.explorerUrl} target="_blank" rel="noreferrer">
              Ver no {EXPLORER_NAME[order.network]}
              <span className="sr-only"> (abre em nova aba; transação simulada)</span>
            </a>
          </Button>
        )}
      </section>
      <div aria-hidden="true" className="h-2.5 bg-primary" />
    </article>
  )
}
