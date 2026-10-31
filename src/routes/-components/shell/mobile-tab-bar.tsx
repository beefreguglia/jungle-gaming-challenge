import { Link, useLocation } from '@tanstack/react-router'
import type * as React from 'react'

import { cn } from '@/shared/lib/utils'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { HeartIcon, HomeIcon, ScanIcon, ShopIcon, UserIcon } from '@/shared/ui/icons'
import { NotchedBottomBar } from '@/shared/ui/notched-bottom-bar'

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
        // Figma: text-secondary icons, text-accent for the current page
        'relative grid size-12 place-items-center rounded-xl text-muted-foreground',
        active && 'text-accent-foreground',
      )}
    >
      <Icon />
      <span className="sr-only">
        {label}
        {badge ? `, ${badge} ${badge === 1 ? 'item' : 'itens'}` : ''}
      </span>
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-tiny font-bold text-primary-foreground tabular-nums"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

/**
 * Bottom navigation of the mobile frames (below md): Início and Favoritos, the raised QR
 * action in the notch, Carrinho and Conta.
 */
export function MobileTabBar({ cartCount }: { cartCount: number }) {
  const { pathname } = useLocation()

  return (
    <NotchedBottomBar
      label="Principal"
      className="md:hidden"
      start={[
        <Tab key="home" to="/" label="Início" icon={HomeIcon} active={pathname === '/'} />,
        <Tab
          key="favorites"
          to="/conta/favoritos"
          label="Favoritos"
          icon={HeartIcon}
          active={pathname === '/conta/favoritos'}
        />,
      ]}
      action={
        <ComingSoon
          reason="Leitura de QR code em breve"
          className="grid size-full place-items-center rounded-full bg-linear-to-b from-primary/40 to-primary text-foreground opacity-100 shadow-[0_8px_20px_-4px_rgb(210_138_76/0.55)]"
        >
          <ScanIcon />
        </ComingSoon>
      }
      end={[
        <Tab
          key="cart"
          to="/carrinho"
          label="Carrinho"
          icon={ShopIcon}
          active={pathname === '/carrinho'}
          badge={cartCount}
        />,
        <Tab
          key="account"
          to="/conta"
          label="Minha conta"
          icon={UserIcon}
          active={pathname.startsWith('/conta') && pathname !== '/conta/favoritos'}
        />,
      ]}
    />
  )
}
