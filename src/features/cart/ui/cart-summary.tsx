import { Link } from '@tanstack/react-router'

import { type Cart, canCheckout } from '@/domain/cart'
import { formatEth } from '@/domain/money'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

import { useCartQuote } from '../api/cart-quote'
import { CouponForm } from './coupon-form'

function Row({
  term,
  children,
  strong,
}: {
  term: string
  children: React.ReactNode
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4',
        strong && 'border-t border-border pt-4',
      )}
    >
      <dt className={cn('text-14 md:text-14', strong && 'text-16 font-bold')}>{term}</dt>
      <dd
        className={cn('text-15 md:text-16', strong && 'text-18 font-bold text-accent-foreground')}
      >
        {children}
      </dd>
    </div>
  )
}

function Totals({ cart }: { cart: Cart }) {
  const quote = useCartQuote(cart)

  if (!canCheckout(cart)) {
    return (
      <p className="text-14 text-destructive">
        Ajuste os itens marcados no carrinho para ver o total e finalizar.
      </p>
    )
  }
  if (quote.isPending) {
    return (
      <div aria-busy="true" aria-label="Calculando o total" className="flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- static placeholders
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </div>
    )
  }
  if (quote.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-14">
        <p>Não foi possível calcular o total agora.</p>
        <Button size="sm" variant="outline" onClick={() => void quote.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const { subtotal, discount, networkFee, total } = quote.data
  return (
    <dl
      aria-busy={quote.isFetching}
      className={cn(
        'flex flex-col gap-3 transition-opacity',
        quote.isPlaceholderData && 'opacity-60',
      )}
    >
      <Row term="Subtotal">{formatEth(subtotal)}</Row>
      <Row term="Desconto do lançamento">(-) {formatEth(discount)}</Row>
      <Row term="Taxa de rede">
        <span className="flex flex-col items-end">
          {formatEth(networkFee)}
          <span className="text-11 text-accent-foreground">Taxa estimada</span>
        </span>
      </Row>
      <Row term="Total" strong>
        {formatEth(total)}
      </Row>
    </dl>
  )
}

/**
 * "Resumo da carteira": coupon, the API's totals and "Conectar e finalizar". On mobile it
 * is the Figma "Payment Summary" sheet, sticky at the bottom while the list scrolls.
 */
export function CartSummary({ cart }: { cart: Cart }) {
  const ready = canCheckout(cart)
  return (
    <section
      aria-labelledby="summary-heading"
      className="sticky bottom-0 z-30 -mx-7 flex flex-col gap-5 rounded-t-3xl bg-card px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:static md:mx-0 md:rounded-sm md:bg-transparent md:p-0"
    >
      <h2
        id="summary-heading"
        className="sr-only text-18 font-bold md:not-sr-only md:border-b md:border-border md:pb-3"
      >
        Resumo da carteira
      </h2>
      <CouponForm couponCode={cart.couponCode} />
      <Totals cart={cart} />
      <div className="flex flex-col gap-3">
        <Button
          asChild
          size="xl"
          aria-disabled={!ready || undefined}
          className="bg-linear-to-br from-accent-foreground to-primary md:h-10 md:rounded-sm md:bg-none md:text-15"
        >
          <Link
            to="/checkout"
            disabled={!ready}
            onClick={(event) => !ready && event.preventDefault()}
          >
            Conectar e finalizar
          </Link>
        </Button>
        <Link
          to="/"
          hash="catalogo"
          className="hidden text-center text-15 text-accent-foreground hover:underline md:block"
        >
          Continuar explorando
        </Link>
      </div>
    </section>
  )
}
