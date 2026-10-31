import { useRef, useState } from 'react'

import { isApiError } from '@/shared/api'
import { CONNECTION_MESSAGE } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { FormField } from '@/shared/ui/form-field'

import { useApplyCoupon, useRemoveCoupon } from '../api/cart-mutations'

function couponError(error: unknown): string | undefined {
  if (!error) return undefined
  if (isApiError(error) && error.fields?.code) return error.fields.code
  if (isApiError(error) && error.kind === 'validation') return error.message
  return CONNECTION_MESSAGE
}

/**
 * "Código promocional". Invalid and expired codes are answered by the API (422) and shown
 * on the field; an applied coupon can be removed.
 */
export function CouponForm({ couponCode }: { couponCode: string | null }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (couponCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-full border border-primary/60 bg-card px-4 py-2 md:rounded-sm md:bg-transparent">
        <p className="text-14">
          Cupom <strong className="text-accent-foreground">{couponCode}</strong> aplicado
        </p>
        <Button
          variant="link"
          className="text-13"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          Remover
          <span className="sr-only"> cupom {couponCode}</span>
        </Button>
      </div>
    )
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code.trim()) {
      inputRef.current?.focus()
      return
    }
    apply.mutate(code, {
      onSuccess: () => setCode(''),
      onError: () => inputRef.current?.focus(),
    })
  }

  return (
    <form onSubmit={submit} noValidate>
      <FormField label="Código promocional" error={couponError(apply.error)}>
        {(control) => (
          <div className="flex h-[3.125rem] rounded-full border border-input bg-card p-1 focus-within:border-ring focus-within:outline-2 focus-within:outline-ring has-aria-invalid:border-error md:h-10 md:rounded-sm md:bg-background md:p-0">
            <input
              {...control}
              ref={inputRef}
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                if (apply.error) apply.reset()
              }}
              placeholder="Digite o código promocional..."
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-4 text-14 uppercase placeholder:text-subtle placeholder:normal-case focus-visible:outline-none md:px-3 md:text-13"
            />
            <Button
              type="submit"
              disabled={apply.isPending}
              // Figma mobile: foreground text on primary fading from 54% to 100% opacity
              className="h-full rounded-full bg-transparent bg-linear-to-r from-primary/54 to-primary px-5 text-15 text-foreground md:rounded-none md:rounded-r-button md:bg-primary md:bg-none md:px-4 md:text-14 md:text-primary-foreground"
            >
              Aplicar
            </Button>
          </div>
        )}
      </FormField>
    </form>
  )
}
