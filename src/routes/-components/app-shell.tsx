import type { ReactNode } from 'react'

import { MobileTabBar } from './shell/mobile-tab-bar'
import { SiteFooter } from './shell/site-footer'
import { SiteHeader } from './shell/site-header'

interface AppShellProps {
  children: ReactNode
}

// Unit count from the cart query once the cart slice lands (Fase 5.4)
const CART_COUNT_PLACEHOLDER = 0

/**
 * Page frame: header + footer from md up, bottom tab bar below md (mobile frames have no
 * header). Main is the skip-link target; the footer leaves room for the fixed tab bar.
 */
export function AppShell({ children }: AppShellProps) {
  const cartCount = CART_COUNT_PLACEHOLDER

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader cartCount={cartCount} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <div className="pb-24 md:pb-0">
        <SiteFooter />
      </div>
      <MobileTabBar cartCount={cartCount} />
    </div>
  )
}
