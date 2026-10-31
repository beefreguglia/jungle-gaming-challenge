import { describe, expect, it } from 'vitest'

import { authModeOf, authPromptHref, withoutAuthParams } from './auth-route'

const params = (href: string) => Object.fromEntries(new URL(href, 'http://x').searchParams)

describe('authPromptHref', () => {
  it('opens the dialog over home on a direct visit to a private page', () => {
    const href = authPromptHref(undefined, '/checkout?pedido=order_0001')
    expect(href.startsWith('/?')).toBe(true)
    expect(params(href)).toEqual({ auth: 'entrar', redirect: '/checkout?pedido=order_0001' })
  })

  it('keeps the visitor on the page they were on', () => {
    const href = authPromptHref('/carrinho', '/checkout')
    expect(href.startsWith('/carrinho?')).toBe(true)
    expect(params(href)).toEqual({ auth: 'entrar', redirect: '/checkout' })
  })

  it('keeps the page own params and drops an old prompt', () => {
    const href = authPromptHref('/?q=ape&auth=cadastro&redirect=%2Fconta', '/conta/perfil')
    expect(params(href)).toEqual({ q: 'ape', auth: 'entrar', redirect: '/conta/perfil' })
  })

  it('goes home when the private page itself lost the session', () => {
    expect(authPromptHref('/checkout', '/checkout').startsWith('/?')).toBe(true)
  })

  it('keeps the first resume point when a private page bounces again', () => {
    const bounced = authPromptHref('/conta/perfil', '/conta/carteiras')
    // The guard runs again on /conta/perfil (also private) while it is still on screen
    const href = authPromptHref('/conta/perfil', bounced)
    expect(href.startsWith('/?')).toBe(true)
    expect(params(href).redirect).toBe('/conta/carteiras')
  })
})

describe('auth params', () => {
  it('reads the mode and strips the params', () => {
    expect(authModeOf({ auth: 'cadastro' })).toBe('sign-up')
    expect(authModeOf({})).toBeNull()
    expect(withoutAuthParams('/nfts/x?auth=entrar&redirect=%2Fconta#top')).toBe('/nfts/x#top')
  })
})
