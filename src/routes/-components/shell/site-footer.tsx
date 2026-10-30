import { Link } from '@tanstack/react-router'
import { siFacebook, siInstagram, siX, siYoutube, type SimpleIcon } from 'simple-icons'

import type { NftCollection } from '@/domain/nft'
import { BrandIcon } from '@/shared/ui/brand-icon'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { WalletsBadge } from '@/shared/ui/wallets-badge'

import { NewsletterForm } from './newsletter-form'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const COLLECTION_LINKS: { label: string; collection: NftCollection }[] = [
  { label: 'Arte digital', collection: 'digital-art' },
  { label: 'Fotografia', collection: 'photography' },
  { label: 'Música', collection: 'music' },
  { label: 'Arte 3D', collection: '3d-art' },
  { label: 'Utilidade', collection: 'utility' },
]

const HELP_LINKS = [
  'Central de ajuda',
  'Como comprar NFTs',
  'Carteira e segurança',
  'Política do mercado',
  'Denunciar item',
]

const SOCIAL: { label: string; href: string; icon?: SimpleIcon; text?: string }[] = [
  { label: 'Facebook', href: 'https://www.facebook.com', icon: siFacebook },
  { label: 'Instagram', href: 'https://www.instagram.com', icon: siInstagram },
  { label: 'X (Twitter)', href: 'https://x.com', icon: siX },
  // LinkedIn is not in simple-icons; the Figma draws it as "in" text anyway
  { label: 'LinkedIn', href: 'https://www.linkedin.com', text: 'in' },
  { label: 'YouTube', href: 'https://www.youtube.com', icon: siYoutube },
]

const headingClass = 'mb-3 text-body-lg font-bold'
const linkClass = 'text-body hover:text-accent-foreground'

function Features() {
  return (
    <div className="grid gap-8 bg-card px-6 py-8 md:grid-cols-2 lg:grid-cols-4 lg:px-10">
      {FEATURES.map((feature) => (
        <div key={feature.letter} className="lg:border-r lg:border-primary/60 lg:pr-6">
          <span
            aria-hidden="true"
            className="mb-4 grid size-14 place-items-center rounded-full bg-primary text-heading font-bold text-primary-foreground"
          >
            {feature.letter}
          </span>
          <h2 className="mb-3 text-body-lg font-bold">{feature.title}</h2>
          <p className="text-body text-subtle">{feature.text}</p>
        </div>
      ))}
      <NewsletterForm />
    </div>
  )
}

function ContactBand() {
  return (
    <div className="grid gap-4 bg-secondary px-6 py-6 text-body sm:grid-cols-2 lg:grid-cols-4 lg:items-center lg:px-10">
      <p className="font-bold tracking-[0.12em]">KURIO</p>
      <p>Feito para colecionadores, criadores e cultura</p>
      <a href="mailto:contato@email.com" className={linkClass}>
        contato@email.com
      </a>
      <a href="tel:+551140028922" className={linkClass}>
        +55 11 4002 8922
      </a>
    </div>
  )
}

function SitemapColumns() {
  return (
    <div className="grid gap-8 bg-card px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
      <nav aria-labelledby="footer-profile">
        <h2 id="footer-profile" className={headingClass}>
          Meu perfil
        </h2>
        <ul className="space-y-2">
          <li>
            <Link to="/conta" className={linkClass}>
              Meu perfil
            </Link>
          </li>
          <li>
            <ComingSoon className={linkClass}>Minha coleção</ComingSoon>
          </li>
          <li>
            <ComingSoon className={linkClass}>Atividade</ComingSoon>
          </li>
          <li>
            <ComingSoon className={linkClass}>Estúdio do criador</ComingSoon>
          </li>
          <li>
            <Link to="/conta/favoritos" className={linkClass}>
              Lista de interesse
            </Link>
          </li>
        </ul>
      </nav>
      <nav aria-labelledby="footer-help">
        <h2 id="footer-help" className={headingClass}>
          Central de ajuda
        </h2>
        <ul className="space-y-2">
          {HELP_LINKS.map((label) => (
            <li key={label}>
              <ComingSoon className={linkClass}>{label}</ComingSoon>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-labelledby="footer-collections">
        <h2 id="footer-collections" className={headingClass}>
          Coleções
        </h2>
        <ul className="space-y-2">
          {COLLECTION_LINKS.map(({ label, collection }) => (
            <li key={collection}>
              <Link
                to="/"
                search={{ collections: [collection] }}
                hash="catalogo"
                className={linkClass}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div>
        <h2 className={headingClass}>Redes sociais</h2>
        <ul className="mb-6 flex gap-2">
          {SOCIAL.map(({ label, href, icon, text }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-8 place-items-center rounded-sm border border-primary text-accent-foreground hover:bg-primary/10"
              >
                {icon ? (
                  <BrandIcon icon={icon} />
                ) : (
                  <span aria-hidden="true" className="text-body font-bold">
                    {text}
                  </span>
                )}
                <span className="sr-only">{label} (abre em nova aba)</span>
              </a>
            </li>
          ))}
        </ul>
        <h2 className={headingClass}>Carteiras compatíveis</h2>
        <WalletsBadge />
      </div>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 max-w-page px-4 pb-6 xl:px-0">
      <Features />
      <ContactBand />
      <SitemapColumns />
      <p className="mt-6 text-center text-caption">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
