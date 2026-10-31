import { ArrowRightIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { NftImage, preloadNftImage } from '@/shared/ui/nft-image'

// Editorial hero slides; the art changes, the message stays
const SLIDES = [
  { url: '/images/nfts/emerald.webp', alt: 'Macaco de óculos redondos e jaqueta college verde' },
  { url: '/images/nfts/nomad.webp', alt: 'Gorila grisalho de chapéu bucket e moletom roxo' },
  { url: '/images/nfts/golden.webp', alt: 'Orangotango dourado com fones de ouvido verdes' },
]
// Mobile banner pairs each artwork with a smaller one
const COMPANION = [1, 0, 0]
// Time on each slide while it plays on its own
const SLIDE_MS = 6000
// Every rendition of the hero art (mobile banner and desktop column)
const ART_SIZES = '(min-width: 768px) 450px, 138px'

interface CarouselState {
  active: number
  onSelect: (index: number) => void
}

function Dots({ active, onSelect, className }: CarouselState & { className?: string }) {
  return (
    <div role="group" aria-label="Escolher destaque" className={cn('flex', className)}>
      {SLIDES.map((slide, index) => (
        // 24 px touch target (WCAG 2.5.8) around the 8 px dot drawn in the Figma
        <button
          key={slide.url}
          type="button"
          aria-label={`Destaque ${index + 1} de ${SLIDES.length}`}
          aria-current={index === active ? 'true' : undefined}
          onClick={() => onSelect(index)}
          className="group/dot grid size-6 place-items-center"
        >
          <span
            aria-hidden="true"
            className={cn(
              'size-2 rounded-full bg-primary/40 transition-colors group-hover/dot:bg-primary/70',
              index === active && 'bg-primary',
            )}
          />
        </button>
      ))}
    </div>
  )
}

function MobileBanner(carousel: CarouselState) {
  const { active } = carousel
  const main = SLIDES[active] ?? SLIDES[0]!
  const small = SLIDES[COMPANION[active] ?? 1]!
  // "Hero banner": 48 px radius, the orange circles mask over the page color (ink).
  // The mask keeps its proportions (cover), so the circles never stretch on other phones
  return (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-[3rem] bg-background bg-[url(/images/home/banner-surface.png)] bg-cover bg-center bg-no-repeat p-4 md:hidden">
      <div className="flex w-full items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-12 font-medium">Bem-vindo à Kurio</p>
          <h1 className="text-18 leading-[1.8125rem] font-bold">
            SEJA DONO DA <br />
            CULTURA DIGITAL
          </h1>
          <p className="text-12 leading-[1.125rem] text-subtle">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <a
            href="#catalogo"
            className="mt-1 flex w-fit items-center gap-2 text-12 font-bold text-accent-foreground"
          >
            EXPLORAR <ArrowRightIcon className="size-4" aria-hidden="true" />
          </a>
        </div>
        <div className="relative shrink-0">
          <NftImage
            image={main}
            sizes="(min-width: 768px) 1px, 138px"
            priority
            className="size-[8.625rem] rounded-2xl"
          />
          <NftImage
            image={small}
            sizes="(min-width: 768px) 1px, 58px"
            decorative
            className="absolute top-[5.5rem] left-3.5 size-[3.625rem] rounded-2xl border border-card"
          />
        </div>
      </div>
      <Dots {...carousel} />
    </div>
  )
}

function DesktopHero(carousel: CarouselState) {
  const { active } = carousel
  const slide = SLIDES[active] ?? SLIDES[0]!
  return (
    <div className="hidden items-center gap-10 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,28.125rem)] lg:pl-10 xl:gap-[6.875rem]">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <p className="text-12 font-medium">Bem-vindo à Kurio</p>
          <h1 className="text-24 leading-tight font-bold lg:text-32 xl:text-43 xl:leading-[4.375rem]">
            SEJA DONO DO FUTURO <br />
            DA ARTE DIGITAL
          </h1>
          <p className="max-w-[35rem] text-14 leading-6 text-muted-foreground">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital
            rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <a
            href="#catalogo"
            className="grid h-10 w-[8.75rem] place-items-center rounded-button bg-primary text-14 font-bold text-primary-foreground hover:bg-accent-foreground"
          >
            EXPLORAR
          </a>
          <Dots {...carousel} />
        </div>
      </div>
      <NftImage
        image={slide}
        sizes="(min-width: 768px) 450px, 1px"
        priority
        className="w-full rounded-2xl"
      />
    </div>
  )
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Figma hero: compact banner on mobile, text + 450 px art on desktop. The art advances on
 * its own every few seconds; it waits while the pointer or focus is on it (so a chosen dot
 * holds) and stays put when reduced motion is preferred. The next art is fetched in
 * advance, and every slide has the same size, so the switch never moves the layout.
 */
export function HomeHero() {
  const [active, setActive] = useState(0)
  const [autoplay] = useState(() => !prefersReducedMotion())
  const [held, setHeld] = useState(false)
  const rotating = autoplay && !held
  const next = (active + 1) % SLIDES.length

  useEffect(() => {
    if (!rotating) return
    // Halfway through the slide, well after the first paint: fetch the next art
    const preload = window.setTimeout(() => preloadNftImage(SLIDES[next]!, ART_SIZES), SLIDE_MS / 2)
    const advance = window.setTimeout(() => setActive(next), SLIDE_MS)
    return () => {
      window.clearTimeout(preload)
      window.clearTimeout(advance)
    }
  }, [rotating, next])

  const carousel: CarouselState = { active, onSelect: setActive }

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      // Announce the new art only when the user changed it, not on every automatic turn
      aria-live={rotating ? 'off' : 'polite'}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false)
      }}
    >
      <MobileBanner {...carousel} />
      <DesktopHero {...carousel} />
    </section>
  )
}
