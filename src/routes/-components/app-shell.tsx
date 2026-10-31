import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { useCartCount } from '@/features/cart'
import { cn } from '@/shared/lib/utils'

import { MobileTabBar } from './shell/mobile-tab-bar'
import { hasMobileActionBar, hidesMobileTabBar } from './shell/navigation'
import { SiteFooter } from './shell/site-footer'
import { SiteHeader } from './shell/site-header'

interface AppShellProps {
  children: ReactNode
}

/**
 * Page frame: bottom tab bar on mobile (the mobile frames have no header), header + footer
 * from md up. The NFT detail swaps the tab bar for its buy bar. Main is the skip-link target;
 * the footer leaves room for whichever bar is fixed at the bottom.
 */
export function AppShell({ children }: AppShellProps) {
  const cartCount = useCartCount()
  const { pathname } = useLocation()
  const actionBar = hasMobileActionBar(pathname)
  const tabBar = !hidesMobileTabBar(pathname)

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
      <div className={cn('pb-6 md:block md:pb-0', tabBar && 'pb-28', actionBar && 'pb-44')}>
        <SiteFooter />
      </div>
      {tabBar ? <MobileTabBar cartCount={cartCount} /> : null}
    </div>
  )
}
