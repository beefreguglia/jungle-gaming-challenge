import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import type * as React from 'react'

import { useProfile, useWallets } from '@/features/account'
import { useCart } from '@/features/cart'
import { Button } from '@/shared/ui/button'
import { FormAlert } from '@/shared/ui/form-alert'
import { CartIcon } from '@/shared/ui/icons'
import { MarketBreadcrumb, MobilePageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

import { useCheckoutUserId } from '../api/order-queries'
import { type CheckoutStorage, createCheckoutStorage } from '../model/checkout-storage'
import { CheckoutForm } from './checkout-form'
import { OrderProgress } from './order-progress'
import { UnansweredOrderNotice } from './unanswered-order'
import { useOrderSubmission } from './use-order-submission'

function CheckoutSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando o pagamento"
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21.375rem] lg:gap-7"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- static placeholders
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

function EmptyCheckout() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-sm border border-dashed border-border-soft px-6 py-16 text-center">
      <CartIcon className="size-10 text-accent-foreground" aria-hidden="true" />
      <p className="text-16 font-bold">Não há nada para pagar</p>
      <p className="max-w-sm text-14 text-muted-foreground">
        Seu carrinho está vazio. Adicione NFTs do catálogo para finalizar uma compra.
      </p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Explorar o catálogo
        </Link>
      </Button>
    </div>
  )
}

/**
 * A purchase sent before a reload may already be paid, which empties the cart: the
 * unanswered attempt is offered first, so it is never hidden behind "nothing to pay".
 */
function ResumeOrder({ storage }: { storage: CheckoutStorage }) {
  const order = useOrderSubmission({ storage })
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
      {order.unanswered ? (
        <UnansweredOrderNotice
          reason={order.unanswered.reason}
          checking={order.pending}
          onCheck={order.retry}
        />
      ) : (
        <EmptyCheckout />
      )}
      <FormAlert message={order.formError} />
    </div>
  )
}

function CheckoutContent() {
  const userId = useCheckoutUserId()
  const storage = useMemo(() => createCheckoutStorage(userId), [userId])
  const cart = useCart()
  const wallets = useWallets()
  const profile = useProfile()
  const queries = [cart, wallets, profile]

  if (queries.some((query) => query.isError)) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>Não foi possível carregar o pagamento.</p>
        <Button
          onClick={() => {
            for (const query of queries) if (query.isError) void query.refetch()
          }}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }
  if (!cart.data || !wallets.data || !profile.data) return <CheckoutSkeleton />
  if (cart.data.lines.length === 0) {
    return storage.attempt.get() ? <ResumeOrder storage={storage} /> : <EmptyCheckout />
  }
  return <CheckoutForm cart={cart.data} wallets={wallets.data} profile={profile.data} />
}

/** `/checkout`: the payment form, or the order it created (`?pedido=`) while it settles. */
export function CheckoutPage({ orderId }: { orderId?: string }) {
  let body: React.ReactNode = <CheckoutContent />
  if (orderId) body = <OrderProgress orderId={orderId} />
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-7 pt-8 pb-12 md:gap-7 md:px-4 xl:px-0">
      <MobilePageHeader title="Pagamento com carteira" />
      {/* Desktop: the Figma shows only the breadcrumb, so the page title is for screen readers */}
      <h1 className="hidden md:sr-only md:block">Pagamento</h1>
      <MarketBreadcrumb current="Pagamento" />
      {body}
    </div>
  )
}
