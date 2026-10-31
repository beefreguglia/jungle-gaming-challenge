import { Link } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'
import type * as React from 'react'

import { Button } from '@/shared/ui/button'
import { MarketBreadcrumb, MobilePageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

import { useCart, useCartKey } from '../api/cart-queries'
import { CartLineRow } from './cart-line-row'
import { CartNotices } from './cart-notices'
import { CartSummary } from './cart-summary'

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-sm border border-dashed border-border-soft px-6 py-16 text-center md:col-span-full">
      <ShoppingCartIcon className="size-10 text-accent-foreground" aria-hidden="true" />
      <p className="text-16 font-bold">Seu carrinho está vazio</p>
      <p className="max-w-sm text-14 text-muted-foreground">
        Explore o catálogo e adicione os NFTs que quiser colecionar.
      </p>
      <Button asChild>
        <Link to="/" hash="catalogo">
          Explorar o catálogo
        </Link>
      </Button>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando o carrinho"
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20.75rem] lg:gap-20"
    >
      <div className="flex flex-col gap-5">
        {Array.from({ length: 3 }, (_, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- static placeholders
          <Skeleton
            key={index}
            className="h-[6.25rem] w-full rounded-xl md:h-[4.5rem] md:rounded-sm"
          />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

/**
 * Cart page, mobile first: header with back, line cards and the summary sheet pinned at the
 * bottom (Figma "Mobile / Carrinho"). From md: breadcrumb, table and summary column.
 */
export function CartPage({ related }: { related?: React.ReactNode }) {
  const key = useCartKey()
  const cart = useCart()

  let body: React.ReactNode
  if (key && (cart.isPending || !cart.data)) body = <CartSkeleton />
  else if (!cart.data || cart.data.lines.length === 0) body = <EmptyCart />
  else {
    body = (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20.75rem] lg:gap-20">
        <div className="flex flex-col gap-4">
          <CartNotices cart={cart.data} />
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_6.5rem_2.5rem] gap-x-3 border-b border-border pr-4 pb-2 pl-2 text-15 font-bold md:grid"
          >
            <span>NFTs</span>
            <span>Preço</span>
            <span>Quantidade</span>
            <span>Total</span>
            {/* Same column template and gaps as CartLineRow keep headers over their values */}
          </div>
          <ul aria-label="Itens do carrinho" className="flex flex-col gap-5 md:gap-2">
            {cart.data.lines.map((line) => (
              <CartLineRow key={line.id} line={line} />
            ))}
          </ul>
        </div>
        <CartSummary cart={cart.data} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-7 pt-8 md:gap-7 md:px-4 xl:px-0">
      <MobilePageHeader title="Carrinho de NFTs" />
      {/* Desktop: the Figma shows only the breadcrumb, so the page title is for screen readers */}
      <h1 className="hidden md:sr-only md:block">Carrinho de NFTs</h1>
      <MarketBreadcrumb current="Carrinho" />
      {body}
      {related}
    </div>
  )
}
