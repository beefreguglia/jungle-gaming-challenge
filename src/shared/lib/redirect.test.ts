import { describe, expect, it } from 'vitest'

import { safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it('keeps in-app paths with search and hash', () => {
    expect(safeRedirect('/checkout?step=review#total')).toBe('/checkout?step=review#total')
  })

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', 'checkout', '', 42, null])(
    'falls back for %s',
    (target) => {
      expect(safeRedirect(target)).toBe('/')
    },
  )
})
