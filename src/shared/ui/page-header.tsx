import { Link, useRouter } from '@tanstack/react-router'

import { ChevronLeftIcon } from './icons'

/**
 * Mobile screen header from the Figma frames (cart, payment): round back button and a
 * centered title. Back goes to the previous page, or home when opened directly.
 */
export function MobilePageHeader({ title }: { title: string }) {
  const router = useRouter()
  return (
    <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center md:hidden">
      <button
        type="button"
        aria-label="Voltar"
        onClick={() =>
          router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/' })
        }
        className="grid size-9 place-items-center rounded-full bg-secondary hover:text-accent-foreground"
      >
        <ChevronLeftIcon className="size-5" aria-hidden="true" />
      </button>
      <h1 className="text-center text-18 font-bold">{title}</h1>
    </div>
  )
}

/** Desktop "Início / Mercado / <page>" trail of the buying screens. */
export function MarketBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Trilha de navegação" className="hidden text-14 font-bold md:block">
      <ol className="flex gap-1">
        <li>
          <Link to="/" className="hover:text-accent-foreground">
            Início
          </Link>
          <span aria-hidden="true"> /</span>
        </li>
        <li>
          <Link to="/" hash="catalogo" className="hover:text-accent-foreground">
            Mercado
          </Link>
          <span aria-hidden="true"> /</span>
        </li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  )
}
