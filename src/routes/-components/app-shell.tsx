import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

import { MobileTabBar } from './shell/mobile-tab-bar'
import { isAuthPath } from './shell/navigation'
import { SiteFooter } from './shell/site-footer'
import { SiteHeader } from './shell/site-header'

interface AppShellProps {
  children: ReactNode
}

// Unit count from the cart query once the cart slice lands (Fase 5.4)
const CART_COUNT_PLACEHOLDER = 0

/**
 * Page frame: bottom tab bar on mobile (the mobile frames have no header), header + footer
 * from md up. Auth pages are full screen on mobile, so they drop the tab bar and footer
 * there. Main is the skip-link target; the footer leaves room for the fixed tab bar.
 */
export function AppShell({ children }: AppShellProps) {
  const cartCount = CART_COUNT_PLACEHOLDER
  const fullScreenOnMobile = isAuthPath(useLocation().pathname)

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
      <div className={cn('pb-24 md:block md:pb-0', fullScreenOnMobile && 'hidden')}>
        <SiteFooter />
      </div>
      {fullScreenOnMobile ? null : <MobileTabBar cartCount={cartCount} />}
    </div>
  )
}
