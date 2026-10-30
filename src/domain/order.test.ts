import { describe, expect, it } from 'vitest'

import {
  canTransition,
  checkoutDetailsSchema,
  type CreateOrderInput,
  orderRequestFingerprint,
  shouldApplyOrderUpdate,
} from './order'

const details = {
  displayName: 'Nova Sato',
  username: 'nova_sato',
  network: 'ethereum',
  profileName: 'Nova',
  address: '0x7A42c1d3e5F60718293a4B5c6D7e8F9012a319E8',
  provider: 'metamask',
  referralCode: 'kurio2026',
  email: 'Nova@Example.com',
  ensLabel: 'nova',
} as const

describe('checkoutDetailsSchema', () => {
  it('accepts the layout fields and normalizes them', () => {
    const parsed = checkoutDetailsSchema.parse(details)
    expect(parsed.email).toBe('nova@example.com')
    expect(parsed.referralCode).toBe('KURIO2026')
  })

  it('validates the address against the selected network', () => {
    const result = checkoutDetailsSchema.safeParse({ ...details, network: 'solana' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['address'])
  })
})

describe('order status', () => {
  it('only leaves pending, and terminal states never change', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true)
    expect(canTransition('pending', 'refused')).toBe(true)
    expect(canTransition('confirmed', 'refused')).toBe(false)
    expect(canTransition('refused', 'pending')).toBe(false)
  })

  it('ignores stale, duplicate and regressing updates', () => {
    const pending = { status: 'pending', version: 2 } as const
    expect(shouldApplyOrderUpdate(undefined, pending)).toBe(true)
    expect(shouldApplyOrderUpdate(pending, { status: 'confirmed', version: 3 })).toBe(true)
    expect(shouldApplyOrderUpdate(pending, { status: 'confirmed', version: 2 })).toBe(false)
    expect(
      shouldApplyOrderUpdate(
        { status: 'confirmed', version: 3 },
        { status: 'pending', version: 4 },
      ),
    ).toBe(false)
  })
})

describe('orderRequestFingerprint', () => {
  const input: CreateOrderInput = {
    quoteId: 'q1',
    connectionId: 'c1',
    details: checkoutDetailsSchema.parse(details),
  }

  it('does not depend on key order', () => {
    const reordered = { details: input.details, connectionId: 'c1', quoteId: 'q1' }
    expect(orderRequestFingerprint(reordered)).toBe(orderRequestFingerprint(input))
  })

  it('changes when the content changes', () => {
    expect(orderRequestFingerprint({ ...input, quoteId: 'q2' })).not.toBe(
      orderRequestFingerprint(input),
    )
  })
})
