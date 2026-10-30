import { ArrowRightIcon } from 'lucide-react'

import { ComingSoon } from '@/shared/ui/coming-soon'
import { NftImage } from '@/shared/ui/nft-image'

// Figma "Diário da Cunhagem". Articles are editorial pages, outside the delivered scope
const POSTS = [
  {
    date: '12 de setembro',
    reading: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/images/nfts/baron.webp',
  },
  {
    date: '13 de setembro',
    reading: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/images/nfts/emerald.webp',
  },
  {
    date: '15 de setembro',
    reading: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/images/nfts/nomad.webp',
  },
  {
    date: '15 de setembro',
    reading: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/images/nfts/golden.webp',
  },
]

export function MintJournal() {
  return (
    <section aria-labelledby="journal-heading" className="flex flex-col gap-10">
      <header className="flex flex-col gap-3 text-center">
        <h2 id="journal-heading" className="text-24 font-bold md:text-28">
          Diário da Cunhagem
        </h2>
        <p className="text-12 text-subtle md:text-13">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-sm bg-card">
              <NftImage
                image={{ url: post.image, alt: '' }}
                sizes="(min-width: 1024px) 268px, (min-width: 640px) 50vw, 100vw"
                decorative
                className="aspect-[268/195] w-full object-cover object-top"
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-11 text-subtle">
                  {post.date} <span aria-hidden="true">|</span> {post.reading}
                </p>
                <h3 className="text-15 leading-5 font-bold">{post.title}</h3>
                <p className="flex-1 text-11 leading-4 text-subtle">{post.text}</p>
                <ComingSoon
                  reason="Artigos em breve"
                  className="flex w-fit items-center gap-1 text-12 font-bold text-accent-foreground"
                >
                  Ler mais <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">: {post.title}</span>
                </ComingSoon>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
