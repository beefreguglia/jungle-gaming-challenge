import { Link } from '@tanstack/react-router'
import { SearchXIcon } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

/** Same layout as the loaded page (mobile hero + sheet, desktop two columns). */
export function NftDetailSkeleton() {
  return (
    // At least one screen tall: the footer starts below the fold, so the real page (taller
    // than this placeholder) never pushes it in view (CLS)
    <div aria-busy="true" aria-label="Carregando NFT" className="flex min-h-dvh flex-col">
      <div className="bg-card px-7 pt-6 pb-32 md:hidden" aria-hidden="true">
        <div className="mb-3 flex justify-between">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <Skeleton className="aspect-square w-full rounded-[2rem]" />
      </div>
      <div
        aria-hidden="true"
        className="relative -mt-28 flex flex-col gap-4 rounded-t-3xl bg-card px-6 pt-8 md:mx-auto md:mt-0 md:w-full md:max-w-page md:rounded-none md:bg-transparent md:px-4 md:pt-16 lg:grid lg:grid-cols-[minmax(0,35.8rem)_minmax(0,1fr)] lg:gap-8 xl:px-0"
      >
        <Skeleton className="hidden aspect-square w-full md:block" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              // oxlint-disable-next-line react/no-array-index-key -- static placeholders
              <Skeleton key={index} className="h-7 w-14 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-2/3" />
        </div>
      </div>
    </div>
  )
}

/** Direct access to an id that does not exist (404 from the API). */
export function NftNotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-24 text-center">
      <SearchXIcon className="size-10 text-accent-foreground" aria-hidden="true" />
      <h1 className="text-24 font-bold">NFT não encontrado</h1>
      <p className="text-14 text-muted-foreground">
        Este NFT não existe ou foi removido do mercado. Que tal explorar o catálogo?
      </p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Explorar o catálogo
        </Link>
      </Button>
    </section>
  )
}
