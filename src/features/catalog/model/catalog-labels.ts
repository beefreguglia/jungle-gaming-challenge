import type { NftCollection, NftNetwork, NftSort, NftView } from '@/domain/nft'

// Figma labels for the catalog filters, tabs and sort (sidebar "Coleções", "Rede")
export const COLLECTION_LABEL: Record<NftCollection, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d-art': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  memberships: 'Assinaturas',
  utility: 'Utilidade',
}

export const NETWORK_LABEL: Record<NftNetwork, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

// "NFT em destaque" is the sidebar banner, not a tab
export const VIEW_TABS: { value: NftView; label: string }[] = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

export const SORT_LABEL: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
}

export function resultsLabel(total: number): string {
  if (total === 0) return 'Nenhum NFT encontrado'
  return total === 1 ? '1 NFT encontrado' : `${total} NFTs encontrados`
}
