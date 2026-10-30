import { ArrowRightIcon } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { NftImage } from '@/shared/ui/nft-image'

// Editorial hero slides; the art changes, the message stays
const SLIDES = [
  { url: '/images/nfts/emerald.webp', alt: 'Macaco de óculos redondos e jaqueta college verde' },
  { url: '/images/nfts/nomad.webp', alt: 'Gorila grisalho de chapéu bucket e moletom roxo' },
  { url: '/images/nfts/golden.webp', alt: 'Orangotango dourado com fones de ouvido verdes' },
]
// Mobile banner pairs each artwork with a smaller one
const COMPANION = [1, 0, 0]

function Dots({
  active,
  onSelect,
  className,
}: {
  active: number
  onSelect: (index: number) => void
  className?: string
}) {
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

function MobileBanner({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {
  const main = SLIDES[active] ?? SLIDES[0]!
  const small = SLIDES[COMPANION[active] ?? 1]!
  return (
    <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-xl bg-linear-to-br from-surface-raised to-card p-4 md:hidden">
      <div className="flex w-full items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-12 font-medium">Bem-vindo à Kurio</p>
          <h1 className="text-18 leading-[1.8125rem] font-bold">
            SEJA DONO DA <br />
            CULTURA DIGITAL
          </h1>
          <p className="text-12 leading-[1.125rem] text-muted-foreground">
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
      <Dots active={active} onSelect={onSelect} />
    </div>
  )
}

function DesktopHero({ active, onSelect }: { active: number; onSelect: (index: number) => void }) {
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
            className="grid h-10 w-[8.75rem] place-items-center rounded-sm bg-primary text-14 font-bold text-primary-foreground hover:bg-accent-foreground"
          >
            EXPLORAR
          </a>
          <Dots active={active} onSelect={onSelect} />
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

/** Figma hero: compact banner on mobile, text + 450 px art on desktop. No autoplay. */
export function HomeHero() {
  const [active, setActive] = useState(0)
  return (
    <section aria-roledescription="carrossel" aria-label="Destaques">
      <MobileBanner active={active} onSelect={setActive} />
      <DesktopHero active={active} onSelect={setActive} />
    </section>
  )
}
