import { createFileRoute, notFound } from '@tanstack/react-router'
import type * as React from 'react'
import { siFacebook, siGoogle } from 'simple-icons'
import { toast } from 'sonner'

import { BrandIcon } from '@/shared/ui/brand-icon'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { ComingSoon } from '@/shared/ui/coming-soon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/shared/ui/sheet'
import { Skeleton } from '@/shared/ui/skeleton'
import { Slider } from '@/shared/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'
import { WalletsBadge } from '@/shared/ui/wallets-badge'

/**
 * Development-only gallery of the shared UI components (`/ui-preview`). Production builds
 * answer 404 before the page code is requested, so it never reaches users.
 */
export const Route = createFileRoute('/ui-preview')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: UiPreview,
})

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-sm border border-border bg-card/40 p-6">
      <h2 className="text-caption font-bold tracking-[0.2em] text-subtle uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Buttons() {
  return (
    <Block title="Botões">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Comprar</Button>
        <Button variant="outline">Favoritar</Button>
        <Button variant="secondary">Secundário</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Remover</Button>
        <Button variant="link">Continuar explorando</Button>
        <Button disabled>Desabilitado</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Pequeno</Button>
        <Button size="lg">Grande</Button>
        <Button variant="outline" size="icon" aria-label="Entrar com Google">
          <BrandIcon icon={siGoogle} colored />
        </Button>
        <Button variant="outline" size="icon" aria-label="Entrar com Facebook">
          <BrandIcon icon={siFacebook} colored />
        </Button>
      </div>
      <Button size="xl" className="w-full">
        Comprar NFT (mobile)
      </Button>
    </Block>
  )
}

function Fields() {
  return (
    <Block title="Campos">
      <div className="grid gap-2">
        <Label htmlFor="preview-name">
          Nome de exibição <span className="text-destructive">*</span>
        </Label>
        <Input id="preview-name" placeholder="Endereço 0x da carteira" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="preview-invalid">Campo com erro</Label>
        <Input
          id="preview-invalid"
          aria-invalid
          aria-describedby="preview-error"
          defaultValue="nova@"
        />
        <p id="preview-error" className="text-caption text-destructive">
          E-mail inválido
        </p>
      </div>
      <Select>
        <SelectTrigger aria-label="Rede">
          <SelectValue placeholder="Selecione uma rede" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ethereum">Ethereum</SelectItem>
          <SelectItem value="polygon">Polygon</SelectItem>
          <SelectItem value="solana">Solana</SelectItem>
        </SelectContent>
      </Select>
      <Textarea aria-label="Observação do colecionador" placeholder="Observação (opcional)" />
    </Block>
  )
}

function Choices() {
  return (
    <Block title="Seleção">
      <div className="grid gap-2">
        <p className="text-body-lg font-bold">Faixa de preço</p>
        <Slider
          defaultValue={[2, 1230]}
          min={2}
          max={1230}
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          formatValue={(value) => `${(value / 100).toFixed(2).replace('.', ',')} ETH`}
        />
      </div>
      <RadioGroup defaultValue="coinbase" aria-label="Carteira">
        {[
          ['metamask', 'MetaMask'],
          ['coinbase', 'Coinbase Wallet'],
        ].map(([value, label]) => (
          <div key={value} className="flex items-center gap-2">
            <RadioGroupItem id={`preview-${value}`} value={value as string} />
            <Label htmlFor={`preview-${value}`}>{label}</Label>
          </div>
        ))}
      </RadioGroup>
      <div className="flex items-center gap-2">
        <Checkbox id="preview-other" />
        <Label htmlFor="preview-other">Usar outra carteira?</Label>
      </div>
      <WalletsBadge />
    </Block>
  )
}

function Overlays() {
  return (
    <Block title="Sobreposições e feedback">
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Abrir diálogo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Entrar</DialogTitle>
            <DialogDescription>
              Entre para gerenciar sua carteira, coleção e perfil de criador.
            </DialogDescription>
            <Input aria-label="E-mail" placeholder="contato@email.com" />
            <Button>Entrar</Button>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Abrir painel lateral</Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="p-4">
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Coleções, faixa de preço e rede.</SheetDescription>
            </div>
          </SheetContent>
        </Sheet>
        <Button variant="secondary" onClick={() => toast.success('NFT adicionado ao carrinho')}>
          Toast de sucesso
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.error('Não foi possível favoritar', { description: 'Tente novamente.' })
          }
        >
          Toast de erro
        </Button>
      </div>
      <p className="text-body">
        Ação fora do escopo: <ComingSoon className="underline">Estúdio do criador</ComingSoon>
      </p>
    </Block>
  )
}

function TabsAndLoading() {
  return (
    <Block title="Abas e carregamento">
      <Tabs defaultValue="details">
        <TabsList variant="line">
          <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
          <TabsTrigger value="reviews">Avaliações de colecionadores (19)</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="pt-4">
          <div aria-busy="true" aria-label="Carregando NFT" className="flex gap-4">
            <Skeleton className="aspect-square w-32 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="pt-4">
          Avaliações aparecem aqui.
        </TabsContent>
      </Tabs>
    </Block>
  )
}

function UiPreview() {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10 xl:px-0">
      <header>
        <h1 className="text-heading font-bold">Vitrine de componentes</h1>
        <p className="text-muted-foreground">
          Só em desenvolvimento. Componentes de <code>src/shared/ui</code> no visual do Figma.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Buttons />
        <Fields />
        <Choices />
        <Overlays />
      </div>
      <TabsAndLoading />
    </div>
  )
}
