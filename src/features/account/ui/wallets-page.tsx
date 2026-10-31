import { useId, useState } from 'react'
import { toast } from 'sonner'

import type { Wallets } from '@/domain/wallet'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'

import { useSavePrimaryWallet, useSaveSecondaryWallet, useWallets } from '../api/account-queries'
import { secondaryWalletView } from '../model/secondary-wallet-view'
import { WalletForm } from './wallet-form'

function SecondaryWallet({ wallets }: { wallets: Wallets }) {
  const save = useSaveSecondaryWallet()
  const { primary } = wallets
  const [adding, setAdding] = useState(false)
  // Reflects the click at once (the save takes a moment); the saved value takes over after
  const [linking, setLinking] = useState(false)
  const checkboxId = useId()
  const hintId = useId()
  const view = secondaryWalletView(wallets, adding)

  function toggleSame(checked: boolean) {
    if (checked) {
      setLinking(true)
      save.mutate(
        { sameAsPrimary: true },
        {
          onSettled: () => setLinking(false),
          onSuccess: () => toast.success('A carteira secundária agora usa os dados da principal'),
          onError: () => toast.error('Não foi possível salvar a carteira secundária'),
        },
      )
      return
    }
    // Unlinking: start from the primary's data and let the user change what differs
    setAdding(true)
  }

  return (
    <section aria-labelledby="secondary-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="secondary-heading" className="text-16 font-bold md:text-17">
          Carteira secundária
        </h2>
        <div className="flex items-center gap-2">
          <Checkbox
            id={checkboxId}
            checked={view.same || linking}
            disabled={!primary || save.isPending}
            aria-describedby={primary ? undefined : hintId}
            onCheckedChange={(checked) => toggleSame(checked === true)}
          />
          <Label htmlFor={checkboxId} className="text-14 font-normal">
            Igual à carteira principal
          </Label>
        </div>
      </div>
      {!primary && (
        <p id={hintId} className="text-14 text-subtle">
          Cadastre a carteira principal para poder repeti-la aqui.
        </p>
      )}
      {view.same && (
        <p className="text-14 text-subtle">Usa os mesmos dados da carteira principal.</p>
      )}
      {view.empty && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-14 text-subtle">Você ainda não adicionou uma carteira secundária.</p>
          <Button variant="link" className="text-15" onClick={() => setAdding(true)}>
            Adicionar
            <span className="sr-only"> carteira secundária</span>
          </Button>
        </div>
      )}
      {view.form && (
        <WalletForm
          key={view.form.initial?.id ?? 'new-secondary'}
          initial={view.form.initial}
          submitLabel="Salvar carteira secundária"
          onSave={async (input) => {
            await save.mutateAsync(input)
            setAdding(false)
          }}
        />
      )}
    </section>
  )
}

/** Figma "Carteiras": primary wallet form, then the secondary one (own or same as primary). */
export function WalletsPage() {
  const wallets = useWallets()
  const savePrimary = useSavePrimaryWallet()

  if (wallets.isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando carteiras"
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        {Array.from({ length: 10 }, (_, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- static placeholders
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    )
  }
  if (wallets.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>Não foi possível carregar suas carteiras.</p>
        <Button onClick={() => void wallets.refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  const { primary } = wallets.data
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="primary-heading" className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 id="primary-heading" className="text-16 font-bold md:text-17">
            Carteira principal
          </h2>
          <p className="text-14 text-accent-foreground">
            Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
          </p>
        </div>
        <WalletForm
          key={primary?.id ?? 'new-primary'}
          initial={primary}
          submitLabel="Salvar carteira"
          onSave={(input) => savePrimary.mutateAsync(input)}
        />
      </section>
      <SecondaryWallet wallets={wallets.data} />
    </div>
  )
}
