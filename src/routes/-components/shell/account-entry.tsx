import { Link, useLocation } from '@tanstack/react-router'
import { LogInIcon } from 'lucide-react'

import { useSession } from '@/features/session'
import { Button } from '@/shared/ui/button'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** "Entrar" for visitors (returning to the current page after login), avatar for members. */
export function AccountEntry() {
  const { session } = useSession()
  const location = useLocation()
  // On the auth pages themselves, keep their own redirect instead of nesting a new one
  const onAuthPage = ['/login', '/cadastro'].includes(location.pathname)

  if (!session) {
    return (
      <Button asChild size="sm" className="h-9 px-3 text-body">
        <Link
          to="/login"
          search={(previous) => (onAuthPage ? previous : { redirect: location.href })}
        >
          <LogInIcon className="size-5" />
          Entrar
        </Link>
      </Button>
    )
  }

  const { displayName, avatarUrl } = session.user
  return (
    <Link
      to="/conta"
      className="flex items-center gap-2 rounded-full text-body font-medium hover:text-accent-foreground"
    >
      <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-secondary text-caption font-bold text-accent-foreground">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initials(displayName)
        )}
      </span>
      <span className="hidden max-w-32 truncate lg:inline">{displayName}</span>
      <span className="sr-only lg:hidden">Minha conta</span>
    </Link>
  )
}
