import { Link, useNavigate } from '@tanstack/react-router'
import { CircleXIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { formatEth } from '@/domain/money'
import { NETWORK_LABEL } from '@/features/catalog'
import { isApiError, useRealtimeStatus } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

import { useCheckoutUserId, useOrder } from '../api/order-queries'
import { createCheckoutStorage } from '../model/checkout-storage'

const panelClass =
  'mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-sm bg-card px-6 py-10 text-center'

/**
 * The order after "Confirmar compra" (`/checkout?pedido=…`). It survives reloads and
 * reconnections: the state always comes from the API. Only a confirmed order opens the
 * receipt; a refused one leaves the cart as it was.
 */
export function OrderProgress({ orderId }: { orderId: string }) {
  const order = useOrder(orderId)
  const realtime = useRealtimeStatus()
  const navigate = useNavigate()
  const userId = useCheckoutUserId()
  const storage = useMemo(() => createCheckoutStorage(userId), [userId])
  const status = order.data?.status

  useEffect(() => {
    if (status !== 'confirmed') return
    storage.draft.clear()
    void navigate({ to: '/pedidos/$orderId', params: { orderId }, replace: true })
  }, [status, storage, navigate, orderId])

  if (order.isPending) {
    return <Skeleton aria-label="Carregando o pedido" className="mx-auto h-64 w-full max-w-xl" />
  }
  if (order.isError) {
    const missing = isApiError(order.error) && order.error.kind === 'not_found'
    return (
      <div role="alert" className={panelClass}>
        <p className="text-16 font-bold">
          {missing ? 'Pedido não encontrado' : 'Não foi possível consultar o pedido'}
        </p>
        {missing ? (
          <Button asChild>
            <Link to="/checkout">Voltar ao pagamento</Link>
          </Button>
        ) : (
          <Button onClick={() => void order.refetch()}>Tentar novamente</Button>
        )}
      </div>
    )
  }

  const { data } = order
  if (data.status === 'refused') {
    return (
      <section role="alert" aria-labelledby="order-heading" className={panelClass}>
        <CircleXIcon className="size-12 text-destructive" aria-hidden="true" />
        <h2 id="order-heading" className="text-18 font-bold">
          Pagamento recusado
        </h2>
        <p className="text-14">{data.refusalReason}</p>
        <p className="text-14 text-subtle">Os NFTs continuam no seu carrinho.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/checkout">Revisar e tentar novamente</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/carrinho">Voltar ao carrinho</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section role="status" aria-labelledby="order-heading" className={panelClass}>
      <LoaderCircleIcon
        className="size-12 animate-spin text-accent-foreground motion-reduce:animate-none"
        aria-hidden="true"
      />
      <h2 id="order-heading" className="text-18 font-bold">
        {data.status === 'confirmed' ? 'Pagamento confirmado' : 'Processando pagamento'}
      </h2>
      <p className="text-14">
        Aguardando a confirmação da rede {NETWORK_LABEL[data.network]} para{' '}
        {data.lines.length === 1 ? '1 item' : `${data.lines.length} itens`}, total de{' '}
        {formatEth(data.total)}.
      </p>
      <p className="text-13 text-subtle">
        Você pode recarregar esta página: a compra continua e não será feita de novo.
      </p>
      {realtime !== 'connected' && (
        <p className="text-13 text-accent-foreground">
          Sem conexão em tempo real. Consultando o pedido a cada poucos segundos.
        </p>
      )}
    </section>
  )
}
