import { describe, expect, it } from 'vitest'

import { isNewerVersion } from './versioning'

describe('isNewerVersion', () => {
  it('applies the first version seen', () => {
    expect(isNewerVersion(undefined, 1)).toBe(true)
  })

  it('applies only strictly newer versions', () => {
    expect(isNewerVersion(3, 4)).toBe(true)
    expect(isNewerVersion(3, 3)).toBe(false)
    expect(isNewerVersion(3, 2)).toBe(false)
  })
})
