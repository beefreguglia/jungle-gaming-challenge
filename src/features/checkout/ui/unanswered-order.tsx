import { Button } from '@/shared/ui/button'

/** An order sent but never answered (timeout, reload mid-request), checked with its key. */
export function UnansweredOrderNotice({
  reason,
  checking,
  onCheck,
}: {
  reason: 'timeout' | 'resumed'
  checking: boolean
  onCheck: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-sm border border-amber/60 bg-amber/10 px-4 py-3 text-14"
    >
      <p className="font-bold">
        {reason === 'timeout'
          ? 'A confirmação da compra está demorando'
          : 'Você tinha uma compra em andamento'}
      </p>
      <p>
        Ela pode já ter sido registrada. Verifique antes de continuar: a mesma compra nunca é
        cobrada duas vezes.
      </p>
      <Button type="button" size="sm" disabled={checking} onClick={onCheck} className="self-start">
        {checking ? 'Verificando…' : 'Verificar compra'}
      </Button>
    </div>
  )
}
