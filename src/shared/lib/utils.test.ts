import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('keeps a text color next to a custom font size', () => {
    expect(cn('text-accent-foreground', 'text-body')).toBe('text-accent-foreground text-body')
  })

  it('still resolves conflicts inside each group', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption')
    expect(cn('text-foreground', 'text-accent-foreground')).toBe('text-accent-foreground')
    expect(cn('h-10 px-4', 'h-15')).toBe('px-4 h-15')
  })

  it('treats the exact Figma sizes as font sizes', () => {
    expect(cn('text-coral', 'text-14')).toBe('text-coral text-14')
    expect(cn('text-body', 'text-15')).toBe('text-15')
  })
})
