import { useLocation, useNavigate } from '@tanstack/react-router'
import { HeartIcon } from 'lucide-react'

import { useSession } from '@/features/session'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

import { useIsFavorite, useToggleFavorite } from '../api/favorites-queries'

interface FavoriteButtonProps {
  nftId: string
  nftName: string
  // "icon": round heart over artwork (cards, mobile detail); "button": "Favoritar" (desktop)
  variant?: 'icon' | 'button'
  className?: string
}

/**
 * Heart toggle. Favorites belong to an account: a visitor is sent to sign in and comes
 * back to the same page. The pressed state is announced, not just colored.
 */
export function FavoriteButton({
  nftId,
  nftName,
  variant = 'icon',
  className,
}: FavoriteButtonProps) {
  const { session } = useSession()
  const favorite = useIsFavorite(nftId)
  const toggle = useToggleFavorite()
  const navigate = useNavigate()
  const location = useLocation()

  function onClick() {
    if (!session) {
      void navigate({ to: '/login', search: { redirect: location.href } })
      return
    }
    toggle.mutate({ nftId, favorite: !favorite })
  }

  // Fixed label + aria-pressed: the state is announced once, as "pressed" / "not pressed"
  const heart = (
    <HeartIcon
      aria-hidden="true"
      className={cn('size-5 transition-colors', favorite && 'fill-current text-accent-foreground')}
    />
  )

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        aria-pressed={favorite}
        onClick={onClick}
        className={cn('text-15 font-normal text-foreground', className)}
      >
        {heart}
        Favoritar
      </Button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={`Favoritar ${nftName}`}
      onClick={onClick}
      className={cn(
        'grid size-9 place-items-center rounded-full border border-border-soft bg-background/80 text-foreground backdrop-blur-sm hover:text-accent-foreground',
        className,
      )}
    >
      {heart}
    </button>
  )
}
