import { multiplyEth, percentOfEth, type Eth } from '@/domain/money'
import {
  lowestEditionPrice,
  NFT_COLLECTIONS,
  NFT_NETWORKS,
  type NftCollection,
  type NftDetail,
  type NftEdition,
} from '@/domain/nft'

/**
 * Deterministic catalog: the nine pieces drawn in the Figma first, then generated ones built
 * from the same four artworks. Same input → same output, so tests and baselines are stable.
 */

export interface NftRecord extends NftDetail {
  // Catalog sections; mock-only flags, stripped from responses by the domain schemas
  featured: boolean
  trending: boolean
  isNew: boolean
}

type Artwork = 'emerald' | 'nomad' | 'baron' | 'golden'

const ARTWORK_ALT: Record<Artwork, string> = {
  emerald: 'Macaco de pelo castanho com óculos redondos e jaqueta college verde',
  nomad: 'Gorila grisalho com chapéu bucket verde e moletom roxo',
  baron: 'Gorila de pelo escuro com gola alta verde e blazer creme',
  golden: 'Orangotango dourado com fones de ouvido verdes e jaqueta clara',
}

const imageUrl = (artwork: Artwork) => `/images/nfts/${artwork}.webp`

interface Seed {
  name: string
  artwork: Artwork
  // Price of the 1/50 edition; the others derive from it
  basePrice: Eth
  compareAtPrice?: Eth
  collection: NftCollection
}

// Pieces shown in the Figma, with their exact prices
const FIGMA_SEEDS: Seed[] = [
  { name: 'Emerald Ape #042', artwork: 'emerald', basePrice: '1.19', collection: 'digital-art' },
  { name: 'Sage Nomad #009', artwork: 'nomad', basePrice: '1.69', collection: 'digital-art' },
  {
    name: 'Neon Vessel #552',
    artwork: 'baron',
    basePrice: '1.99',
    compareAtPrice: '2.29',
    collection: 'digital-art',
  },
  { name: 'Cosmic Bloom #118', artwork: 'nomad', basePrice: '1.29', collection: 'generative' },
  { name: 'Violet Nomad #314', artwork: 'nomad', basePrice: '1.39', collection: 'collectibles' },
  { name: 'Ivory Baron #088', artwork: 'baron', basePrice: '1.79', collection: '3d-art' },
  { name: 'Golden Beat #207', artwork: 'golden', basePrice: '0.99', collection: 'music' },
  { name: 'Golden Frequency #071', artwork: 'golden', basePrice: '0.59', collection: 'music' },
  { name: 'Golden Signal #160', artwork: 'golden', basePrice: '0.39', collection: 'music' },
]

const ADJECTIVES = [
  'Amber',
  'Velvet',
  'Lunar',
  'Copper',
  'Quiet',
  'Solar',
  'Rust',
  'Midnight',
  'Honey',
  'Cedar',
  'Static',
  'Jade',
  'Ember',
  'Pixel',
  'Dune',
  'Opal',
  'Cobalt',
]
const NOUNS: Record<Artwork, string[]> = {
  emerald: ['Ape', 'Rebel', 'Captain', 'Drifter'],
  nomad: ['Nomad', 'Wanderer', 'Bloom', 'Hiker'],
  baron: ['Baron', 'Vessel', 'Curator', 'Envoy'],
  golden: ['Beat', 'Signal', 'Echo', 'Groove'],
}
const ARTWORKS: Artwork[] = ['emerald', 'nomad', 'baron', 'golden']
const SERIES: Record<Artwork, string> = {
  emerald: 'Kurio Apes',
  nomad: 'Nomad Club',
  baron: 'Baron Society',
  golden: 'Golden Frequencies',
}
const CREATORS = [
  { id: 'creator-nova', name: 'Nova Sato' },
  { id: 'creator-ravi', name: 'Ravi Lima' },
  { id: 'creator-ines', name: 'Inês Duarte' },
  { id: 'creator-theo', name: 'Theo Park' },
]
const ATTRIBUTES: Record<Artwork, string[]> = {
  emerald: ['Óculos', 'Esmeralda', 'Jaqueta college'],
  nomad: ['Chapéu bucket', 'Moletom', 'Sereno'],
  baron: ['Gola alta', 'Blazer', 'Elegante'],
  golden: ['Fones', 'Ritmo', 'Dourado'],
}

const GENERATED_COUNT = 51
const LISTED_FROM = Date.UTC(2026, 9, 28, 12)
const DAY = 24 * 60 * 60 * 1000

function generatedSeed(index: number): Seed {
  const artwork = ARTWORKS[index % ARTWORKS.length] as Artwork
  const nouns = NOUNS[artwork]
  const adjective = ADJECTIVES[(index * 7) % ADJECTIVES.length] as string
  const noun = nouns[index % nouns.length] as string
  const number = String((index * 37 + 11) % 1000).padStart(3, '0')
  // 0.05 … 12.30 ETH, spread so price filters have something to cut
  const cents = 5 + ((index * 977) % 1226)
  return {
    name: `${adjective} ${noun} #${number}`,
    artwork,
    basePrice: (cents / 100).toFixed(2),
    compareAtPrice: index % 11 === 3 ? ((cents * 1.15) / 100).toFixed(2) : undefined,
    collection: NFT_COLLECTIONS[(index * 5) % NFT_COLLECTIONS.length] as NftCollection,
  }
}

function editions(id: string, basePrice: Eth, index: number): NftEdition[] {
  const all: NftEdition[] = [
    { id: `${id}-1of1`, name: '1/1', price: multiplyEth(basePrice, 3), supply: 1, available: 1 },
    {
      id: `${id}-1of10`,
      name: '1/10',
      price: percentOfEth(multiplyEth(basePrice, 3), 50),
      supply: 10,
      available: 6,
    },
    { id: `${id}-1of50`, name: '1/50', price: basePrice, supply: 50, available: 24 },
    { id: `${id}-open`, name: 'Aberta', price: basePrice, supply: 999, available: 999 },
  ]
  // Deterministic stock variety: a sold-out 1/1, low stock, and a fully sold-out piece
  if (index % 3 === 1) (all[0] as NftEdition).available = 0
  if (index % 7 === 2) (all[2] as NftEdition).available = 2
  if (index % 17 === 16) for (const edition of all) edition.available = 0
  return all
}

function buildRecord(seed: Seed, index: number): NftRecord {
  const tokenNumber = seed.name.split('#')[1] ?? String(index)
  const id = seed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-$/, '')
  const list = editions(id, seed.basePrice, index)
  const creator = CREATORS[index % CREATORS.length] as (typeof CREATORS)[number]
  const alt = `${seed.name}: ${ARTWORK_ALT[seed.artwork]}`

  return {
    id,
    tokenId: tokenNumber.padStart(4, '0'),
    name: seed.name,
    description: `Um colecionável digital finalizado à mão da coleção ${SERIES[seed.artwork]}, verificado na rede, com arte desbloqueável e acesso para colecionadores.`,
    collection: seed.collection,
    series: SERIES[seed.artwork],
    network: NFT_NETWORKS[index % NFT_NETWORKS.length] as NftRecord['network'],
    creator,
    rarity: index % 5 === 2 ? 'rare' : 'common',
    images: [
      { url: imageUrl(seed.artwork), alt },
      { url: imageUrl(seed.artwork), alt: `${alt} (detalhe do rosto)` },
      { url: imageUrl(seed.artwork), alt: `${alt} (detalhe dos acessórios)` },
      { url: imageUrl(seed.artwork), alt: `${alt} (verso do card)` },
    ],
    price: lowestEditionPrice(list),
    compareAtPrice: seed.compareAtPrice,
    editions: list,
    listedAt: new Date(LISTED_FROM - index * DAY * 0.7).toISOString(),
    version: 1,
    story: [
      `${seed.name} é uma obra digital finalizada à mão da coleção ${SERIES[seed.artwork]}. Cada atributo fica armazenado nos metadados do token e verificado na rede.`,
      `A propriedade inclui arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência. ${creator.name} recebe 5% de direitos autorais nas vendas secundárias.`,
    ],
    attributes: [...ATTRIBUTES[seed.artwork], ...(index % 5 === 2 ? ['Raro'] : [])],
    rating: { average: 4 + ((index * 3) % 10) / 10, count: 3 + ((index * 13) % 40) },
    contract: {
      address: `0x7a42${index.toString(16).padStart(4, '0')}c1d3e5f60718293a4b5c6d7e8f9012a3`,
      standard: 'ERC-721',
      royaltyPercent: 5,
    },
    featured: index === 1,
    trending: index % 4 === 0,
    isNew: index < 12,
  }
}

export function buildNftFixtures(): NftRecord[] {
  const seeds = [
    ...FIGMA_SEEDS,
    ...Array.from({ length: GENERATED_COUNT }, (_, i) => generatedSeed(i)),
  ]
  return seeds.map(buildRecord)
}
