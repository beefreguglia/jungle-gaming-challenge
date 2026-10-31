import { useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon, ZoomInIcon } from 'lucide-react'

import type { NftDetail } from '@/domain/nft'
import { FavoriteButton } from '@/features/favorites'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { NftImage } from '@/shared/ui/nft-image'

interface GalleryProps {
  nft: NftDetail
  active: number
  onSelect: (index: number) => void
}

function BackButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() =>
        router.history.canGoBack() ? router.history.back() : void router.navigate({ to: '/' })
      }
      className="grid size-9 place-items-center rounded-full border border-border-soft bg-background/80 backdrop-blur-sm hover:text-accent-foreground"
    >
      <ChevronLeftIcon className="size-5" aria-hidden="true" />
    </button>
  )
}

/** Mobile "Hero": back and favorite over the artwork, dots to switch views. */
export function MobileGallery({ nft, active, onSelect }: GalleryProps) {
  const image = nft.images[active] ?? nft.images[0]!
  return (
    <div className="flex flex-col gap-3 bg-card px-7 pt-6 pb-32 md:hidden">
      <div className="flex justify-between">
        <BackButton />
        <FavoriteButton nftId={nft.id} nftName={nft.name} />
      </div>
      <NftImage
        image={image}
        sizes="(min-width: 768px) 1px, 92vw"
        priority
        className="w-full rounded-[2rem]"
      />
      {nft.images.length > 1 && (
        <div role="group" aria-label="Vistas da arte" className="flex justify-center">
          {nft.images.map((view, index) => (
            <button
              key={view.alt}
              type="button"
              aria-label={`Vista ${index + 1} de ${nft.images.length}`}
              aria-current={index === active ? 'true' : undefined}
              onClick={() => onSelect(index)}
              className="group/dot grid size-6 place-items-center"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 rounded-full bg-primary/40 group-hover/dot:bg-primary/70',
                  index === active && 'bg-primary',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Desktop "Product Images": 100 px thumbnails beside the 444 px artwork, with zoom. */
export function DesktopGallery({ nft, active, onSelect }: GalleryProps) {
  const image = nft.images[active] ?? nft.images[0]!
  return (
    <div className="hidden gap-7 md:flex">
      <div role="group" aria-label="Vistas da arte" className="flex flex-col gap-4">
        {nft.images.map((view, index) => (
          <button
            key={view.alt}
            type="button"
            aria-label={`Vista ${index + 1}: ${view.alt}`}
            aria-current={index === active ? 'true' : undefined}
            onClick={() => onSelect(index)}
            className={cn(
              'size-[4.5rem] overflow-hidden rounded-sm border-2 border-transparent lg:size-[6.25rem]',
              index === active && 'border-primary',
            )}
          >
            <NftImage image={view} sizes="100px" decorative className="size-full" />
          </button>
        ))}
      </div>
      <div className="relative min-w-0 flex-1 rounded-sm bg-card p-4">
        <NftImage
          image={image}
          sizes="(min-width: 1024px) 444px, 45vw"
          priority
          className="w-full rounded-2xl"
        />
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Ampliar imagem"
              className="absolute top-3 right-3 grid size-[1.875rem] place-items-center rounded-full bg-background/80 hover:text-accent-foreground"
            >
              <ZoomInIcon className="size-4" aria-hidden="true" />
            </button>
          </DialogTrigger>
          <DialogContent
            aria-describedby={undefined}
            className="w-auto max-w-none p-3 sm:max-w-none"
          >
            <DialogTitle className="sr-only">{nft.name}</DialogTitle>
            {/* Square art sized by the smaller side, so zoomed-in or short screens keep the
                whole image and the close button in view */}
            <NftImage
              image={image}
              sizes="768px"
              className="h-auto w-[min(calc(90vw-1.5rem),calc(90dvh-1.5rem),45rem)] rounded-xl"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
