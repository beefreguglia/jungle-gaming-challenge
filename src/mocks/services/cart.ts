import type { AddCartItemInput, Cart, CartLine } from '@/domain/cart'
import { mergeCartLines } from '@/domain/cart'
import { API_ERROR_CODES } from '@/domain/errors'
import { findEdition } from '@/domain/nft'
import { isCouponExpired } from '@/domain/quote'

import type { Backend } from '../backend'
import type { CartItemRecord, CartRecord } from '../db/database'
import { findCoupon } from '../fixtures/coupons'
import type { UserRecord } from '../fixtures/users'
import { fail } from '../lib/errors'
import { findNftRecord } from './catalog'

interface CartOwner {
  user: UserRecord | null
  // Visitor cart id from the X-Cart-Id header
  cartId: string | null
}

function touch(backend: Backend, cart: CartRecord): void {
  cart.updatedAt = backend.now().toISOString()
  backend.db.commit()
}

/**
 * Members always get their own cart. Visitors get the cart named by X-Cart-Id, or a fresh
 * one when the id is missing or unknown (e.g. after a reset); the client stores the new id.
 */
export function resolveCart(backend: Backend, { user, cartId }: CartOwner): CartRecord {
  const { carts } = backend.db.state
  const existing = user
    ? carts.find((cart) => cart.userId === user.id)
    : carts.find((cart) => cart.id === cartId && cart.userId === null)
  if (existing) return existing

  const cart: CartRecord = {
    id: user?.cartId ?? backend.db.nextId('cart'),
    userId: user?.id ?? null,
    items: [],
    couponCode: null,
    updatedAt: backend.now().toISOString(),
  }
  carts.push(cart)
  backend.db.commit()
  return cart
}

function toLine(backend: Backend, item: CartItemRecord): CartLine | null {
  const nft = backend.db.state.nfts.find((record) => record.id === item.nftId)
  const edition = nft && findEdition(nft, item.editionId)
  if (!nft || !edition) return null
  return {
    id: item.id,
    nftId: nft.id,
    editionId: edition.id,
    quantity: item.quantity,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.images[0] as CartLine['image'],
    editionName: edition.name,
    unitPrice: edition.price,
    available: edition.available,
    nftVersion: nft.version,
  }
}

export function toCartView(backend: Backend, cart: CartRecord): Cart {
  return {
    id: cart.id,
    lines: cart.items.map((item) => toLine(backend, item)).filter((line) => line !== null),
    couponCode: cart.couponCode,
    updatedAt: cart.updatedAt,
  }
}

function assertStock(available: number, quantity: number): void {
  if (available === 0) {
    throw fail.conflict(API_ERROR_CODES.editionUnavailable, 'Esta edição está esgotada')
  }
  if (quantity > available) {
    const message = `Restam apenas ${available} unidade(s) desta edição`
    throw fail.conflict(API_ERROR_CODES.quantityExceeded, message, { quantity: message })
  }
}

export function addItem(backend: Backend, cart: CartRecord, input: AddCartItemInput): Cart {
  const nft = findNftRecord(backend, input.nftId)
  const edition = findEdition(nft, input.editionId)
  if (!edition) throw fail.notFound('Edição não encontrada')

  const existing = cart.items.find(
    (item) => item.nftId === input.nftId && item.editionId === input.editionId,
  )
  const quantity = (existing?.quantity ?? 0) + input.quantity
  assertStock(edition.available, quantity)

  if (existing) existing.quantity = quantity
  else cart.items.push({ id: backend.db.nextId('line'), ...input })
  touch(backend, cart)
  return toCartView(backend, cart)
}

function findItem(cart: CartRecord, lineId: string): CartItemRecord {
  const item = cart.items.find((line) => line.id === lineId)
  if (!item) throw fail.notFound('Item não está no carrinho')
  return item
}

export function updateItem(
  backend: Backend,
  cart: CartRecord,
  change: { lineId: string; quantity: number },
): Cart {
  const item = findItem(cart, change.lineId)
  const edition = findEdition(findNftRecord(backend, item.nftId), item.editionId)
  // Lowering the quantity is always allowed, even if stock dropped below it meanwhile
  if (change.quantity > item.quantity) assertStock(edition?.available ?? 0, change.quantity)
  item.quantity = change.quantity
  touch(backend, cart)
  return toCartView(backend, cart)
}

export function removeItem(backend: Backend, cart: CartRecord, lineId: string): Cart {
  findItem(cart, lineId)
  cart.items = cart.items.filter((item) => item.id !== lineId)
  touch(backend, cart)
  return toCartView(backend, cart)
}

/** Validates a coupon code; shared by PUT /cart/coupon and the quote (which re-checks it). */
export function assertCouponUsable(backend: Backend, code: string) {
  const coupon = findCoupon(code)
  if (!coupon) {
    throw fail.unprocessable(API_ERROR_CODES.couponInvalid, 'Código promocional inválido', {
      code: 'Código promocional inválido',
    })
  }
  if (isCouponExpired(coupon, backend.now())) {
    throw fail.unprocessable(API_ERROR_CODES.couponExpired, 'Este código promocional expirou', {
      code: 'Este código promocional expirou',
    })
  }
  return coupon
}

export function setCoupon(backend: Backend, cart: CartRecord, code: string | null): Cart {
  cart.couponCode = code === null ? null : assertCouponUsable(backend, code).code
  touch(backend, cart)
  return toCartView(backend, cart)
}

/** Moves a visitor cart into the member's cart on login (POST /cart/merge). */
export function mergeVisitorCart(
  backend: Backend,
  user: UserRecord,
  visitorCartId: string | null,
): Cart {
  const memberCart = resolveCart(backend, { user, cartId: null })
  const { state } = backend.db
  const visitorCart = state.carts.find((cart) => cart.id === visitorCartId && cart.userId === null)
  if (!visitorCart) return toCartView(backend, memberCart)

  const withStock = (item: CartItemRecord) => ({
    ...item,
    available: findEdition(findNftRecord(backend, item.nftId), item.editionId)?.available ?? 0,
  })
  memberCart.items = mergeCartLines(
    memberCart.items.map(withStock),
    visitorCart.items.map(withStock),
  ).map(({ available: _available, ...item }) => item)
  memberCart.couponCode ??= visitorCart.couponCode
  state.carts = state.carts.filter((cart) => cart !== visitorCart)
  touch(backend, memberCart)
  return toCartView(backend, memberCart)
}

/** After a confirmed order: removes exactly the purchased quantities, nothing more. */
export function removePurchased(
  backend: Backend,
  cartId: string,
  purchased: { editionId: string; nftId: string; quantity: number }[],
): void {
  const cart = backend.db.state.carts.find((item) => item.id === cartId)
  if (!cart) return
  for (const line of purchased) {
    const item = cart.items.find(
      (entry) => entry.nftId === line.nftId && entry.editionId === line.editionId,
    )
    if (item) item.quantity -= line.quantity
  }
  cart.items = cart.items.filter((item) => item.quantity > 0)
  cart.couponCode = cart.items.length > 0 ? cart.couponCode : null
  touch(backend, cart)
}
