import { formatEth } from '@/domain/money'
import { diffQuotes, type Quote, type QuoteChange } from '@/domain/quote'

export interface QuoteReview {
  // The quote whose values the user agreed to; its id is the one sent with the order
  reviewed: Quote
  // What differs in the latest quote; non-empty means a new confirmation is required
  changes: QuoteChange[]
}

/**
 * Compares the quote the user reviewed with the latest one from the API. A different
 * network is the user's own choice, and a re-issued quote with the same values changes
 * nothing, so both are taken silently; any real difference must be accepted.
 */
export function reviewQuote(reviewed: Quote | null, latest: Quote): QuoteReview {
  if (!reviewed || reviewed.network !== latest.network) return { reviewed: latest, changes: [] }
  const changes = diffQuotes(reviewed, latest)
  return changes.length === 0 ? { reviewed: latest, changes } : { reviewed, changes }
}

/** One readable sentence per change, for the "values changed" notice. */
export function describeQuoteChange(change: QuoteChange): string {
  switch (change.type) {
    case 'price':
      return `${change.name}: preço de ${formatEth(change.from)} para ${formatEth(change.to)}`
    case 'quantity':
      return `${change.name}: quantidade de ${change.from} para ${change.to}`
    case 'removed':
      return `${change.name} saiu do pedido`
    case 'added':
      return `${change.name} entrou no pedido`
    case 'fee':
      return `Taxa de rede: de ${formatEth(change.from)} para ${formatEth(change.to)}`
    case 'discount':
      return `Desconto: de ${formatEth(change.from)} para ${formatEth(change.to)}`
  }
}
