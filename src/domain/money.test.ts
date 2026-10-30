import { describe, expect, it } from 'vitest'

import {
  addEth,
  compareEth,
  ethSchema,
  formatEth,
  isEqualEth,
  multiplyEth,
  parseEthInput,
  subtractEth,
  sumEth,
} from './money'

describe('ethSchema', () => {
  it.each(['0', '1', '0.02', '12.30', '0.000000000000000001'])('accepts %s', (value) => {
    expect(ethSchema.safeParse(value).success).toBe(true)
  })

  it.each(['', '-1', '1e-3', '1,5', '.5', '1.', '0.0000000000000000001', ' 1'])(
    'rejects "%s"',
    (value) => {
      expect(ethSchema.safeParse(value).success).toBe(false)
    },
  )
})

describe('arithmetic', () => {
  it('keeps decimal precision where floats would drift', () => {
    expect(addEth('0.1', '0.2')).toBe('0.3')
    expect(multiplyEth('0.07', 3)).toBe('0.21')
    expect(sumEth(['0.1', '0.2', '0.3'])).toBe('0.6')
  })

  it('preserves wei precision', () => {
    expect(addEth('0.000000000000000001', '1')).toBe('1.000000000000000001')
  })

  it('returns canonical strings without trailing zeros', () => {
    expect(addEth('1.50', '0')).toBe('1.5')
    expect(sumEth([])).toBe('0')
  })

  it('clamps subtraction at zero', () => {
    expect(subtractEth('1', '0.25')).toBe('0.75')
    expect(subtractEth('0.1', '0.5')).toBe('0')
  })

  it('rejects non-integer or negative quantities', () => {
    expect(() => multiplyEth('1', 1.5)).toThrow(RangeError)
    expect(() => multiplyEth('1', -1)).toThrow(RangeError)
  })

  it('rejects invalid amounts instead of coercing them', () => {
    expect(() => addEth('1e3', '1')).toThrow(RangeError)
  })

  it('compares by value, not by string', () => {
    expect(compareEth('2', '10')).toBe(-1)
    expect(compareEth('1.0', '1')).toBe(0)
    expect(isEqualEth('12.30', '12.3')).toBe(true)
  })
})

describe('formatEth', () => {
  it('uses pt-BR separators and the unit', () => {
    expect(formatEth('12.3')).toBe('12,30 ETH')
    expect(formatEth('1234567.5')).toBe('1.234.567,50 ETH')
  })

  it('trims extra zeros but keeps the minimum decimals', () => {
    expect(formatEth('0.02')).toBe('0,02 ETH')
    expect(formatEth('0.1234')).toBe('0,1234 ETH')
    expect(formatEth('5', { minDecimals: 0 })).toBe('5 ETH')
  })

  it('rounds half up at the display precision', () => {
    expect(formatEth('0.12345')).toBe('0,1235 ETH')
    expect(formatEth('0.00001')).toBe('0,00 ETH')
  })

  it('can omit the unit', () => {
    expect(formatEth('0.5', { withUnit: false })).toBe('0,50')
  })
})

describe('parseEthInput', () => {
  it('accepts comma or dot as decimal separator', () => {
    expect(parseEthInput('0,02')).toBe('0.02')
    expect(parseEthInput(' 12.30 ')).toBe('12.3')
  })

  it.each(['', 'abc', '-1', '1.000,00', '1e2'])('returns null for "%s"', (raw) => {
    expect(parseEthInput(raw)).toBeNull()
  })
})
