import { Link, useLocation } from '@tanstack/react-router'
import { HeartIcon, HouseIcon, ScanLineIcon, ShoppingCartIcon, UserRoundIcon } from 'lucide-react'
import type * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { ComingSoon } from '@/shared/ui/coming-soon'

interface TabProps {
  to: '/' | '/conta/favoritos' | '/carrinho' | '/conta'
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  badge?: number
}

function Tab({ to, label, icon: Icon, active, badge }: TabProps) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative grid size-12 place-items-center rounded-xl text-subtle',
        active && 'text-accent-foreground',
      )}
    >
      <Icon className={cn('size-6', active && 'fill-current')} />
      <span className="sr-only">
        {label}
        {badge ? `, ${badge} ${badge === 1 ? 'item' : 'itens'}` : ''}
      </span>
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-tiny font-bold text-primary-foreground"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

/** Bottom navigation of the mobile frames (below md), with the raised center action. */
export function MobileTabBar({ cartCount }: { cartCount: number }) {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-4xl bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-18 max-w-md items-center justify-around px-4">
        <li>
          <Tab to="/" label="Início" icon={HouseIcon} active={pathname === '/'} />
        </li>
        <li>
          <Tab
            to="/conta/favoritos"
            label="Favoritos"
            icon={HeartIcon}
            active={pathname === '/conta/favoritos'}
          />
        </li>
        <li className="-mt-10">
          <ComingSoon
            reason="Leitura de QR code em breve"
            className="grid size-16 place-items-center rounded-full border-4 border-background bg-linear-to-b from-accent-foreground to-primary text-primary-foreground opacity-100"
          >
            <ScanLineIcon className="size-7" aria-hidden="true" />
          </ComingSoon>
        </li>
        <li>
          <Tab
            to="/carrinho"
            label="Carrinho"
            icon={ShoppingCartIcon}
            active={pathname === '/carrinho'}
            badge={cartCount}
          />
        </li>
        <li>
          <Tab
            to="/conta"
            label="Minha conta"
            icon={UserRoundIcon}
            active={pathname.startsWith('/conta') && pathname !== '/conta/favoritos'}
          />
        </li>
      </ul>
    </nav>
  )
}
