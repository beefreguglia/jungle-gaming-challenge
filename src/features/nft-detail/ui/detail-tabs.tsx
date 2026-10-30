import { formatEth } from '@/domain/money'
import type { NftDetail } from '@/domain/nft'
import { shortenHash } from '@/domain/validation'
import { NETWORK_LABEL } from '@/features/catalog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

import { RatingStars } from './nft-meta'

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-14 font-bold text-foreground">{term}:</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** "Detalhes do NFT / Avaliações de colecionadores (19)" — real ARIA tabs (they swap panels). */
export function DetailTabs({ nft }: { nft: NftDetail }) {
  const network = NETWORK_LABEL[nft.network]
  return (
    <Tabs defaultValue="details" className="gap-4">
      <TabsList
        variant="line"
        className="h-auto w-full flex-wrap justify-start gap-x-6 gap-y-2 border-b border-border group-data-horizontal/tabs:h-auto"
      >
        <TabsTrigger value="details" className="flex-none px-0 pb-2 text-15 md:text-16">
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger
          value="reviews"
          className="flex-none px-0 pb-2 text-15 whitespace-normal md:text-16"
        >
          Avaliações de colecionadores ({nft.rating.count})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="flex flex-col gap-5 text-13 leading-6 text-subtle">
        {nft.story.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <dl className="flex flex-col gap-4">
          <Fact term="Rede">
            Cunhado na {network} com procedência imutável e metadados armazenados no IPFS.
          </Fact>
          <Fact term="Contrato">
            {shortenHash(nft.contract.address)} · Contrato inteligente {nft.contract.standard}{' '}
            verificado.
          </Fact>
          <Fact term="Direitos autorais">
            {nft.creator.name} recebe {nft.contract.royaltyPercent}% nas vendas secundárias, pagos
            automaticamente pelos mercados compatíveis.
          </Fact>
          <Fact term="Edições">
            {nft.editions
              .map(
                (edition) =>
                  `${edition.name}: ${formatEth(edition.price)} (${edition.available} disponíveis)`,
              )
              .join(' · ')}
          </Fact>
        </dl>
      </TabsContent>
      <TabsContent value="reviews" className="flex flex-col gap-3 text-14 text-subtle">
        <RatingStars rating={nft.rating} />
        <p>As avaliações escritas dos colecionadores chegam em breve.</p>
      </TabsContent>
    </Tabs>
  )
}
