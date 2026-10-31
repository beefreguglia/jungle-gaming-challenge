import { useLocation, useRouter } from '@tanstack/react-router'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'

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

// The catalog counts as "reached" once its top is this close under the header
const SECTION_REACHED_PX = 48

/**
 * Whether the page is scrolled into the section with this id, i.e. the section has reached
 * the bottom of the (sticky) header and not yet left it. Measured on scroll, once a frame.
 */
function useScrolledInto(id: string, header: RefObject<HTMLElement | null>, enabled: boolean) {
  const [inside, setInside] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let frame = 0
    const measure = () => {
      frame = 0
      const section = document.getElementById(id)
      const line = (header.current?.getBoundingClientRect().bottom ?? 0) + SECTION_REACHED_PX
      const rect = section?.getBoundingClientRect()
      setInside(rect ? rect.top <= line && rect.bottom > line : false)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [id, header, enabled])

  return enabled && inside
}

/**
 * Header link to a page or a section of it. Router `<Link>` marks itself
 * `aria-current="page"` whenever its path matches, so "Início" and "Mercado" (both "/")
 * would both be current on the home page; here the caller decides, in step with the
 * highlight. Modified clicks (new tab, etc.) keep the browser behavior.
 */
function NavLink({
  hash,
  current,
  children,
}: {
  hash?: string
  current: boolean
  children: ReactNode
}) {
  const router = useRouter()
  return (
    <a
      href={router.buildLocation({ to: '/', hash }).href}
      aria-current={current ? 'page' : undefined}
      className={cn(navItemClass, current && activeNavItemClass)}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return
        }
        event.preventDefault()
        void router.navigate({ to: '/', hash })
      }}
    >
      {children}
    </a>
  )
}

interface SiteHeaderProps {
  cartCount: number
}

/**
 * Desktop/tablet header from the Figma frames (hidden below md; mobile uses the tab bar).
 * It stays at the top while scrolling; on the home page the highlight follows the scroll,
 * moving from "Início" to "Mercado" while the catalog is under it.
 */
export function SiteHeader({ cartCount }: SiteHeaderProps) {
  const { pathname } = useLocation()
  const headerRef = useRef<HTMLElement>(null)
  const onHome = pathname === '/'
  const inCatalog = useScrolledInto('catalogo', headerRef, onHome)
  const inMarket = isMarketPath(pathname) || inCatalog

  return (
    <header ref={headerRef} className="hidden md:sticky md:top-0 md:z-40 md:block md:bg-background">
      <div className="mx-auto flex h-19 max-w-page items-center justify-between gap-6 border-b border-border px-4 xl:px-0">
        <Wordmark />
        <nav aria-label="Principal">
          <ul className="flex items-center gap-6 lg:gap-10">
            <li>
              <NavLink current={onHome && !inCatalog}>Início</NavLink>
            </li>
            <li>
              <NavLink hash="catalogo" current={inMarket}>
                Mercado
              </NavLink>
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
