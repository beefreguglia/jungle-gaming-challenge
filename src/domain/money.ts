import Decimal from 'decimal.js'
import { z } from 'zod'

/**
 * ETH amounts travel as decimal strings ("0.125") end to end. Arithmetic goes through
 * decimal.js so values never pass through binary floating point.
 */
export type Eth = string

// Up to 18 fractional digits (wei precision); no sign, exponent or thousands separator
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export const ethSchema = z.string().regex(ETH_PATTERN, 'Invalid ETH amount')

const D = Decimal.clone({ precision: 64, rounding: Decimal.ROUND_HALF_UP })

function toDecimal(value: Eth): Decimal {
  if (!ETH_PATTERN.test(value)) throw new RangeError(`Invalid ETH amount: "${value}"`)
  return new D(value)
}

// Canonical string form: no exponent, no trailing zeros ("1.50" → "1.5")
function fromDecimal(value: Decimal): Eth {
  return value.toFixed()
}

export function addEth(a: Eth, b: Eth): Eth {
  return fromDecimal(toDecimal(a).plus(toDecimal(b)))
}

/** Clamps at zero: a discount larger than the subtotal never yields a negative amount. */
export function subtractEth(a: Eth, b: Eth): Eth {
  return fromDecimal(D.max(toDecimal(a).minus(toDecimal(b)), 0))
}

export function multiplyEth(amount: Eth, quantity: number): Eth {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantity must be a non-negative integer, got ${quantity}`)
  }
  return fromDecimal(toDecimal(amount).times(quantity))
}

export function sumEth(values: readonly Eth[]): Eth {
  return fromDecimal(values.reduce((total, value) => total.plus(toDecimal(value)), new D(0)))
}

export function compareEth(a: Eth, b: Eth): -1 | 0 | 1 {
  return toDecimal(a).comparedTo(toDecimal(b)) as -1 | 0 | 1
}

export function isEqualEth(a: Eth, b: Eth): boolean {
  return compareEth(a, b) === 0
}

interface FormatEthOptions {
  maxDecimals?: number
  minDecimals?: number
  withUnit?: boolean
}

/** Formats for display in pt-BR ("1234.5" → "1.234,50 ETH"). Never use the result in math. */
export function formatEth(
  value: Eth,
  { maxDecimals = 4, minDecimals = 2, withUnit = true }: FormatEthOptions = {},
): string {
  const fixed = toDecimal(value).toFixed(maxDecimals)
  const [integer = '0', fraction = ''] = fixed.split('.')

  const trimmedFraction = fraction.replace(/0+$/, '').padEnd(minDecimals, '0')
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const number = trimmedFraction ? `${groupedInteger},${trimmedFraction}` : groupedInteger

  return withUnit ? `${number} ETH` : number
}

/**
 * Parses user input that may use a pt-BR decimal comma ("0,02") into an Eth string.
 * Returns null when the input is not a valid non-negative amount.
 */
export function parseEthInput(raw: string): Eth | null {
  const normalized = raw.trim().replace(',', '.')
  if (!ETH_PATTERN.test(normalized)) return null
  return fromDecimal(new D(normalized))
}
