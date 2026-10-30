/**
 * Primary navigation from the Figma header. "Mercado" is the catalog: it is highlighted on
 * every buying screen (detail, cart, checkout), like in the frames. Editorial sections are
 * outside the delivered scope and render as "em breve".
 */
export const MARKET_PATHS = ['/nfts', '/carrinho', '/checkout', '/pedidos']

export const COMING_SOON_SECTIONS = ['Criadores', 'Aprenda'] as const

export function isMarketPath(pathname: string): boolean {
  return MARKET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

// Visitor-only pages; the mobile frames show them full screen, without the app chrome
export const AUTH_PATHS = ['/login', '/cadastro']

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname)
}
