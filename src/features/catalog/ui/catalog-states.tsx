import { SearchXIcon, TriangleAlertIcon } from 'lucide-react'
import type * as React from 'react'

import { isApiError } from '@/shared/api'
import { Button } from '@/shared/ui/button'

function StatePanel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-sm border border-dashed border-border-soft px-6 py-14 text-center">
      <span aria-hidden="true" className="text-accent-foreground">
        {icon}
      </span>
      <p className="text-16 font-bold">{title}</p>
      {children}
    </div>
  )
}

export function CatalogEmpty({ onClear, filtered }: { onClear: () => void; filtered: boolean }) {
  return (
    <StatePanel icon={<SearchXIcon className="size-8" />} title="Nenhum NFT encontrado">
      <p className="max-w-sm text-14 text-muted-foreground">
        {filtered
          ? 'Nenhum item combina com a busca e os filtros escolhidos.'
          : 'Ainda não há NFTs nesta seção.'}
      </p>
      {filtered && <Button onClick={onClear}>Limpar filtros</Button>}
    </StatePanel>
  )
}

function describe(error: unknown): string {
  if (isApiError(error) && (error.kind === 'network' || error.kind === 'timeout')) {
    return 'Não conseguimos falar com o servidor. Verifique sua conexão.'
  }
  return 'O catálogo não respondeu como esperado.'
}

export function CatalogError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <div role="alert">
      <StatePanel
        icon={<TriangleAlertIcon className="size-8" />}
        title="Não foi possível carregar os NFTs"
      >
        <p className="max-w-sm text-14 text-muted-foreground">{describe(error)}</p>
        <Button onClick={onRetry} disabled={retrying}>
          {retrying ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      </StatePanel>
    </div>
  )
}

export function InvalidPriceRange({ onReset }: { onReset: () => void }) {
  return (
    <div role="alert">
      <StatePanel icon={<TriangleAlertIcon className="size-8" />} title="Faixa de preço inválida">
        <p className="max-w-sm text-14 text-muted-foreground">
          O preço mínimo está acima do máximo.
        </p>
        <Button onClick={onReset}>Remover faixa de preço</Button>
      </StatePanel>
    </div>
  )
}
