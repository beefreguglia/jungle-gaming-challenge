import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { type Cart, canCheckout } from '@/domain/cart'
import { type CheckoutDetails, checkoutDetailsSchema } from '@/domain/order'
import type { Profile } from '@/domain/profile'
import type { Wallets } from '@/domain/wallet'

import { useCheckoutUserId } from '../api/order-queries'
import { createCheckoutStorage } from '../model/checkout-storage'
import {
  type CheckoutValues,
  initialCheckoutValues,
  registeredWallets,
  toDraftValues,
  WALLET_FIELDS,
  walletFields,
} from '../model/checkout-values'
import { CollectorFields } from './collector-fields'
import { PaymentPanel } from './payment-panel'
import { OTHER_WALLET, SavedWallets } from './saved-wallets'
import { useCheckoutConnection } from './use-checkout-connection'
import { useOrderSubmission } from './use-order-submission'
import { useQuoteReview } from './use-quote-review'

interface CheckoutFormProps {
  cart: Cart
  wallets: Wallets
  profile: Profile
}

/**
 * Figma "Pagamento", mobile first: payment wallet and collector fields, then the order
 * summary, wallet connection and "Confirmar compra" (a side column from lg). The order
 * goes out only with the reviewed API quote and a live wallet connection, under an
 * idempotency key that survives timeouts and reloads.
 */
export function CheckoutForm({ cart, wallets, profile }: CheckoutFormProps) {
  const userId = useCheckoutUserId()
  const storage = useMemo(() => createCheckoutStorage(userId), [userId])
  const saved = registeredWallets(wallets)
  const [draft] = useState(() => storage.draft.get())
  const [walletChoice, setWalletChoice] = useState(
    () => draft?.walletChoice ?? saved[0]?.slot ?? OTHER_WALLET,
  )
  const changesRef = useRef<HTMLDivElement>(null)
  const connectRef = useRef<HTMLButtonElement>(null)

  const form = useForm<CheckoutValues, unknown, CheckoutDetails>({
    resolver: zodResolver(checkoutDetailsSchema),
    defaultValues: initialCheckoutValues(
      profile,
      saved.find((wallet) => wallet.slot === walletChoice) ?? null,
      draft,
    ),
  })
  const { register, control, handleSubmit, setValue, getValues, formState } = form
  const values = useWatch({ control })
  const [network, provider, address] = useWatch({
    control,
    name: ['network', 'provider', 'address'],
  })

  const review = useQuoteReview(cart, network || 'ethereum')
  const { reviewed, changes } = review
  const wallet = useCheckoutConnection(
    form,
    { network, provider, address },
    draft?.connection ?? null,
  )
  const order = useOrderSubmission({
    storage,
    setError: form.setError,
    onConnectionRefused: wallet.invalidate,
  })

  // Everything typed survives a reload or a re-login after the session expires
  useEffect(() => {
    storage.draft.set({
      values: toDraftValues(getValues()),
      walletChoice,
      connection: wallet.connection,
    })
  }, [storage, getValues, values, walletChoice, wallet.connection])

  function chooseWallet(choice: string) {
    setWalletChoice(choice)
    const fields = walletFields(saved.find((item) => item.slot === choice) ?? null)
    for (const field of WALLET_FIELDS) setValue(field, fields[field], { shouldDirty: true })
  }

  // Called from the submit event (not during render): it reads refs to move focus
  const confirm = (details: CheckoutDetails) => {
    order.setFormError(null)
    if (changes.length > 0) {
      order.setFormError('Os valores mudaram. Aceite os novos valores antes de confirmar.')
      changesRef.current?.focus()
      return
    }
    if (!reviewed || !canCheckout(cart)) {
      order.setFormError('O total ainda não está disponível. Revise o pedido antes de confirmar.')
      return
    }
    if (!wallet.live) {
      wallet.setError('Conecte a carteira para confirmar a compra.')
      connectRef.current?.focus()
      return
    }
    order.submit({
      quoteId: reviewed.id,
      connectionId: wallet.live.id,
      details: {
        ...details,
        alternateAddress: details.alternateAddress || undefined,
        note: details.note || undefined,
      },
    })
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(confirm)(event)}
      aria-label="Pagamento"
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21.375rem] lg:gap-7"
    >
      <div className="flex flex-col gap-10">
        <SavedWallets wallets={saved} value={walletChoice} onChange={chooseWallet} />
        <CollectorFields register={register} control={control} errors={formState.errors} />
      </div>

      <PaymentPanel
        cart={cart}
        control={control}
        review={review}
        wallet={wallet}
        order={order}
        changesRef={changesRef}
        connectRef={connectRef}
      />
    </form>
  )
}
