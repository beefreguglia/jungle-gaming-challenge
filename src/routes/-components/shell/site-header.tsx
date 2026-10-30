import { Link, useLocation } from '@tanstack/react-router'

import { cn } from '@/shared/lib/utils'
import { ComingSoon } from '@/shared/ui/coming-soon'

import { AccountEntry } from './account-entry'
import { CartLink } from './cart-link'
import { HeaderSearch } from './header-search'
import { COMING_SOON_SECTIONS, isMarketPath } from './navigation'
import { Wordmark } from './wordmark'

const navItemClass =
  'relative py-2 text-[0.9375rem] transition-colors hover:text-accent-foreground after:absolute after:inset-x-0 after:-bottom-[1.1rem] after:h-0.5 after:bg-transparent'
const activeNavItemClass = 'font-bold text-accent-foreground after:bg-primary'

interface SiteHeaderProps {
  cartCount: number
}

/** Desktop/tablet header from the Figma frames (hidden below md; mobile uses the tab bar). */
export function SiteHeader({ cartCount }: SiteHeaderProps) {
  const { pathname } = useLocation()
  const inMarket = isMarketPath(pathname)
  const onHome = pathname === '/'

  return (
    <header className="hidden md:block">
      <div className="mx-auto flex h-19 max-w-page items-center justify-between gap-6 border-b border-border px-4 xl:px-0">
        <Wordmark />
        <nav aria-label="Principal">
          <ul className="flex items-center gap-6 lg:gap-10">
            <li>
              <Link
                to="/"
                aria-current={onHome ? 'page' : undefined}
                className={cn(navItemClass, onHome && activeNavItemClass)}
              >
                Início
              </Link>
            </li>
            <li>
              <Link
                to="/"
                hash="catalogo"
                aria-current={inMarket ? 'page' : undefined}
                className={cn(navItemClass, inMarket && activeNavItemClass)}
              >
                Mercado
              </Link>
            </li>
            {COMING_SOON_SECTIONS.map((section) => (
              <li key={section}>
                <ComingSoon className="py-2 text-[0.9375rem]">{section}</ComingSoon>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 lg:gap-4">
          <HeaderSearch />
          <CartLink count={cartCount} />
          <AccountEntry />
        </div>
      </div>
    </header>
  )
}
