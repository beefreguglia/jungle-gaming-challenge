import { Link } from '@tanstack/react-router'
import { TriangleAlertIcon } from 'lucide-react'
import { useId } from 'react'
import type * as React from 'react'

import { type Cart, cartLineStatus } from '@/domain/cart'
import { formatEth } from '@/domain/money'
import type { Quote, QuoteChange } from '@/domain/quote'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { SummaryRow } from '@/shared/ui/summary-row'

import { describeQuoteChange } from '../model/quote-review'
import { OrderLines } from './order-lines'

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-sm border border-amber/60 bg-amber/10 px-4 py-3 text-14"
    >
      {children}
    </div>
  )
}

/** Items that can no longer be bought (realtime sold out / stock drop): back to the cart. */
function BlockedLines({ cart }: { cart: Cart }) {
  const blocked = cart.lines.filter((line) => cartLineStatus(line) !== 'ok')
  if (blocked.length === 0) return null
  return (
    <Notice>
      <p className="flex items-start gap-2 font-bold">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        A disponibilidade mudou
      </p>
      <ul className="list-disc pl-5">
        {blocked.map((line) => (
          <li key={line.id}>
            {line.name} ({line.editionName}):{' '}
            {line.available === 0 ? 'esgotado' : `restam ${line.available}`}
          </li>
        ))}
      </ul>
      <Link to="/carrinho" className="font-bold text-accent-foreground underline">
        Ajustar no carrinho
      </Link>
    </Notice>
  )
}

/** Values that changed since the review: shown until the user accepts them. */
function QuoteChanges({
  changes,
  onAccept,
  noticeRef,
}: {
  changes: QuoteChange[]
  onAccept: () => void
  noticeRef: React.Ref<HTMLDivElement>
}) {
  if (changes.length === 0) return null
  return (
    <div ref={noticeRef} tabIndex={-1} className="outline-none">
      <Notice>
        <p className="flex items-start gap-2 font-bold">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Os valores do pedido mudaram
        </p>
        <ul className="list-disc pl-5">
          {changes.map((change) => {
            const text = describeQuoteChange(change)
            return <li key={text}>{text}</li>
          })}
        </ul>
        <Button type="button" size="sm" onClick={onAccept} className="self-start">
          Aceitar novos valores
        </Button>
      </Notice>
    </div>
  )
}

interface OrderSummaryProps {
  cart: Cart
  // Latest API quote (dimmed while a new one loads); undefined while blocked or loading
  quote: Quote | undefined
  loading: boolean
  refreshing: boolean
  failed: boolean
  onRetry: () => void
  changes: QuoteChange[]
  onAcceptChanges: () => void
  changesRef: React.Ref<HTMLDivElement>
}

/** "Seus NFTs": the quote's lines and totals, plus whatever changed while paying. */
export function OrderSummary({
  cart,
  quote,
  loading,
  refreshing,
  failed,
  onRetry,
  changes,
  onAcceptChanges,
  changesRef,
}: OrderSummaryProps) {
  const headingId = useId()

  let body: React.ReactNode
  if (loading) {
    body = (
      <div aria-busy="true" aria-label="Calculando o total" className="flex flex-col gap-3">
        {cart.lines.map((line) => (
          <Skeleton key={line.id} className="h-16 w-full" />
        ))}
        <Skeleton className="h-28 w-full" />
      </div>
    )
  } else if (failed || !quote) {
    body = (
      <div role="alert" className="flex flex-col items-start gap-2 text-14">
        <p>Não foi possível calcular o total agora.</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )
  } else {
    body = (
      <div
        aria-busy={refreshing}
        className={cn('flex flex-col gap-5 transition-opacity', refreshing && 'opacity-60')}
      >
        <OrderLines lines={quote.lines} label="NFTs do pedido" />
        <p className="text-center text-14">
          {quote.coupon ? (
            <>Cupom {quote.coupon.code} aplicado</>
          ) : (
            <>
              Tem um código promocional?{' '}
              <Link to="/carrinho" className="text-accent-foreground underline underline-offset-2">
                Aplique no carrinho
              </Link>
            </>
          )}
        </p>
        <dl className="flex flex-col gap-3">
          <SummaryRow term="Subtotal">{formatEth(quote.subtotal)}</SummaryRow>
          <SummaryRow term="Desconto do lançamento">(-) {formatEth(quote.discount)}</SummaryRow>
          <SummaryRow term="Taxa de rede">
            <span className="flex flex-col items-end">
              {formatEth(quote.networkFee)}
              <span className="text-11 text-accent-foreground">Taxa estimada</span>
            </span>
          </SummaryRow>
          <SummaryRow term="Total" strong>
            {formatEth(quote.total)}
          </SummaryRow>
        </dl>
      </div>
    )
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-16 font-bold">
        Seus NFTs
      </h2>
      <BlockedLines cart={cart} />
      <QuoteChanges changes={changes} onAccept={onAcceptChanges} noticeRef={changesRef} />
      {body}
    </section>
  )
}
