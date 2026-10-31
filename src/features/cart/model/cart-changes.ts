import { type CartLine, cartLineStatus } from '@/domain/cart'
import { formatEth, isEqualEth } from '@/domain/money'

/**
 * What changed in the cart without the user doing it (price or stock pushed by Socket.IO
 * or found on refetch). Quantity changes are the user's own and are not reported.
 */
export function describeCartChanges(previous: CartLine[], next: CartLine[]): string[] {
  const before = new Map(previous.map((line) => [line.id, line]))
  const notices: string[] = []

  for (const line of next) {
    const old = before.get(line.id)
    if (!old) continue
    const label = `${line.name} (${line.editionName})`

    if (!isEqualEth(old.unitPrice, line.unitPrice)) {
      notices.push(
        `${label}: o preço mudou de ${formatEth(old.unitPrice)} para ${formatEth(line.unitPrice)}.`,
      )
    }
    const status = cartLineStatus(line)
    if (line.available < old.available && status === 'sold_out') {
      notices.push(`${label} esgotou. Remova o item para finalizar.`)
    } else if (line.available < old.available && status === 'exceeds_stock') {
      notices.push(`${label}: restam apenas ${line.available}. Ajuste a quantidade.`)
    }
  }
  return notices
}
