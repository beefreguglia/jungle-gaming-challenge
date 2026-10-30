import { describe, expect, it } from 'vitest'

import { defaultNftListParams } from '@/domain/nft'

import { hasActiveFilters, toggleValue } from './catalog-filters'
import { resultsLabel } from './catalog-labels'
import { pageWindow } from './page-window'

describe('pageWindow', () => {
  it('keeps the current page near the start of the window', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4])
    expect(pageWindow(3, 9)).toEqual([2, 3, 4, 5])
  })

  it('never runs past the last page', () => {
    expect(pageWindow(9, 9)).toEqual([6, 7, 8, 9])
    expect(pageWindow(2, 2)).toEqual([1, 2])
  })
})

describe('toggleValue', () => {
  it('adds and removes, and an empty selection means no filter', () => {
    expect(toggleValue(undefined, 'music')).toEqual(['music'])
    expect(toggleValue(['music'], 'gaming')).toEqual(['music', 'gaming'])
    expect(toggleValue(['music'], 'music')).toBeUndefined()
  })
})

describe('hasActiveFilters', () => {
  it('ignores the section tab and the sort, which are not filters', () => {
    expect(hasActiveFilters({ ...defaultNftListParams, view: 'new', sort: 'price-asc' })).toBe(
      false,
    )
    expect(hasActiveFilters({ ...defaultNftListParams, networks: ['solana'] })).toBe(true)
    expect(hasActiveFilters({ ...defaultNftListParams, q: 'ape' })).toBe(true)
  })
})

describe('resultsLabel', () => {
  it('agrees in number', () => {
    expect(resultsLabel(0)).toBe('Nenhum NFT encontrado')
    expect(resultsLabel(1)).toBe('1 NFT encontrado')
    expect(resultsLabel(8)).toBe('8 NFTs encontrados')
  })
})
