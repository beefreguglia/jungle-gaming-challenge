import { Link, useLocation } from '@tanstack/react-router'
import {
  ActivityIcon,
  DownloadIcon,
  HeartIcon,
  MapPinIcon,
  TriangleAlertIcon,
  UserRoundIcon,
} from 'lucide-react'
import type * as React from 'react'

import { useLogout } from '@/features/auth'
import { cn } from '@/shared/lib/utils'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { CartIcon, LogoutIcon } from '@/shared/ui/icons'

type AccountPath = '/conta/perfil' | '/conta/carteiras' | '/conta/favoritos'

const SECTIONS: {
  to: AccountPath
  label: string
  short: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { to: '/conta/perfil', label: 'Dados do perfil', short: 'Perfil', icon: UserRoundIcon },
  { to: '/conta/carteiras', label: 'Carteiras', short: 'Carteiras', icon: MapPinIcon },
  {
    to: '/conta/favoritos',
    label: 'Lista de interesse',
    short: 'Lista de interesse',
    icon: HeartIcon,
  },
]

// Sidebar entries outside the delivered scope (editorial/support pages)
const COMING_SOON = [
  { label: 'Atividade', icon: CartIcon, after: '/conta/carteiras' },
  { label: 'Ofertas', icon: ActivityIcon, after: '/conta/favoritos' },
  { label: 'Arquivos baixados', icon: DownloadIcon, after: '/conta/favoritos' },
  { label: 'Suporte', icon: TriangleAlertIcon, after: '/conta/favoritos' },
]

const rowClass =
  'flex h-11 w-full items-center gap-3 border-l-4 border-transparent px-4 text-15 text-accent-foreground'

function LogoutButton({ className }: { className?: string }) {
  const logout = useLogout()
  return (
    <button
      type="button"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
      className={cn(
        'flex items-center gap-3 font-bold text-accent-foreground hover:underline',
        className,
      )}
    >
      <LogoutIcon className="size-5" aria-hidden="true" />
      Sair
    </button>
  )
}

/** Desktop "Meu perfil" sidebar (Figma), active item marked by bar *and* bold + aria-current. */
function Sidebar({ pathname }: { pathname: string }) {
  const rows: React.ReactNode[] = []
  for (const section of SECTIONS) {
    const active = pathname === section.to
    const Icon = section.icon
    rows.push(
      <li key={section.to}>
        <Link
          to={section.to}
          aria-current={active ? 'page' : undefined}
          className={cn(rowClass, 'hover:bg-secondary/60', active && 'border-primary font-bold')}
        >
          <Icon className="size-5" aria-hidden="true" />
          {section.label}
        </Link>
      </li>,
    )
    for (const item of COMING_SOON.filter((entry) => entry.after === section.to)) {
      rows.push(
        <li key={item.label}>
          <ComingSoon className={rowClass}>
            <span className="flex items-center gap-3">
              <item.icon className="size-5" aria-hidden="true" />
              {item.label}
            </span>
          </ComingSoon>
        </li>,
      )
    }
  }

  return (
    <nav aria-labelledby="account-nav-title" className="hidden self-start bg-card pt-2 md:block">
      <h2 id="account-nav-title" className="px-3 py-2.5 text-18 font-bold">
        Meu perfil
      </h2>
      <ul>{rows}</ul>
      <div className="mt-2 border-t border-border-soft px-4 py-3">
        <LogoutButton className="text-15" />
      </div>
    </nav>
  )
}

/** Mobile (no Figma frame): the three real sections as pills, plus "Sair". */
function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Minha conta" className="flex flex-col gap-4 md:hidden">
      <ul className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => {
          const active = pathname === section.to
          return (
            <li key={section.to}>
              <Link
                to={section.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-9 items-center rounded-full border border-border-soft px-4 text-14',
                  active && 'border-primary font-bold text-accent-foreground',
                )}
              >
                {section.short}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AccountNav() {
  const { pathname } = useLocation()
  return (
    <>
      <Sidebar pathname={pathname} />
      <MobileNav pathname={pathname} />
    </>
  )
}

export { LogoutButton }
