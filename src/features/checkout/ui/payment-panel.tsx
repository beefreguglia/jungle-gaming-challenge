import type * as React from 'react'
import { type Control, Controller } from 'react-hook-form'

import { type Cart, canCheckout } from '@/domain/cart'
import type { CheckoutDetails } from '@/domain/order'
import { Button } from '@/shared/ui/button'
import { FormAlert } from '@/shared/ui/form-alert'

import type { CheckoutValues } from '../model/checkout-values'
import { OrderSummary } from './order-summary'
import { UnansweredOrderNotice } from './unanswered-order'
import type { useCheckoutConnection } from './use-checkout-connection'
import type { useOrderSubmission } from './use-order-submission'
import type { useQuoteReview } from './use-quote-review'
import { WalletConnect } from './wallet-connect'

interface PaymentPanelProps {
  cart: Cart
  control: Control<CheckoutValues, unknown, CheckoutDetails>
  review: ReturnType<typeof useQuoteReview>
  wallet: ReturnType<typeof useCheckoutConnection>
  order: ReturnType<typeof useOrderSubmission>
  changesRef: React.Ref<HTMLDivElement>
  connectRef: React.Ref<HTMLButtonElement>
}

/** Desktop side column / mobile bottom of "Pagamento": summary, wallet and confirmation. */
export function PaymentPanel({
  cart,
  control,
  review: { quote, changes, accept },
  wallet,
  order,
  changesRef,
  connectRef,
}: PaymentPanelProps) {
  return (
    <div className="flex flex-col gap-8 lg:self-start">
      <OrderSummary
        cart={cart}
        quote={quote.data}
        loading={quote.isPending && canCheckout(cart)}
        refreshing={quote.isFetching || quote.isPlaceholderData}
        failed={quote.isError}
        onRetry={() => void quote.refetch()}
        changes={changes}
        onAcceptChanges={() => {
          accept()
          order.setFormError(null)
        }}
        changesRef={changesRef}
      />
      <Controller
        control={control}
        name="provider"
        render={({ field, fieldState }) => (
          <WalletConnect
            provider={field.value}
            onProviderChange={field.onChange}
            providerError={fieldState.error?.message}
            connection={wallet.live}
            stale={wallet.stale}
            connecting={wallet.connecting}
            error={wallet.error}
            onConnect={() => void wallet.open()}
            onDisconnect={wallet.close}
            connectRef={connectRef}
          />
        )}
      />
      <div className="flex flex-col gap-3">
        {order.unanswered && (
          <UnansweredOrderNotice
            reason={order.unanswered.reason}
            checking={order.pending}
            onCheck={order.retry}
          />
        )}
        <FormAlert message={order.formError} />
        <Button
          type="submit"
          variant="cta"
          size="xl"
          disabled={order.pending}
          className="md:h-10 md:bg-primary md:bg-none md:text-15 md:hover:bg-accent-foreground"
        >
          {order.pending ? 'Confirmando compra…' : 'Confirmar compra'}
        </Button>
      </div>
    </div>
  )
}
