import { describe, expect, it } from 'vitest'

import type { CartLine } from '@/domain/cart'

import { describeCartChanges } from './cart-changes'

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    id: 'l1',
    nftId: 'emerald-ape-042',
    editionId: 'emerald-ape-042-1of50',
    quantity: 2,
    name: 'Emerald Ape #042',
    tokenId: '0042',
    image: { url: '/images/nfts/emerald.webp', alt: '' },
    editionName: '1/50',
    unitPrice: '1.19',
    available: 24,
    nftVersion: 1,
    ...overrides,
  }
}

describe('describeCartChanges', () => {
  it('reports price changes', () => {
    expect(describeCartChanges([line()], [line({ unitPrice: '1.29' })])).toEqual([
      'Emerald Ape #042 (1/50): o preço mudou de 1.19 ETH para 1.29 ETH.',
    ])
  })

  it('reports sold out and not-enough-stock separately', () => {
    expect(describeCartChanges([line()], [line({ available: 0 })])).toEqual([
      'Emerald Ape #042 (1/50) esgotou. Remova o item para finalizar.',
    ])
    expect(describeCartChanges([line()], [line({ available: 1 })])).toEqual([
      'Emerald Ape #042 (1/50): restam apenas 1. Ajuste a quantidade.',
    ])
  })

  it('stays quiet about the user’s own changes and new lines', () => {
    expect(describeCartChanges([line()], [line({ quantity: 3 })])).toEqual([])
    expect(describeCartChanges([], [line()])).toEqual([])
  })
})
