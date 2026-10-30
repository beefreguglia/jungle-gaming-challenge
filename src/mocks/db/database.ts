import type { Order } from '@/domain/order'
import type { Quote } from '@/domain/quote'
import type { WalletConnection } from '@/domain/wallet'

import { buildNftFixtures, type NftRecord } from '../fixtures/nfts'
import {
  buildUserFixtures,
  buildWalletFixtures,
  type UserRecord,
  type UserWallets,
} from '../fixtures/users'
import { createStorage, type KeyValueStorage } from './storage'

export interface SessionRecord {
  token: string
  userId: string
  expiresAt: string
}

export interface CartItemRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
}

export interface CartRecord {
  id: string
  userId: string | null
  items: CartItemRecord[]
  couponCode: string | null
  updatedAt: string
}

export interface QuoteRecord {
  quote: Quote
  cartId: string
  userId: string | null
}

export interface OrderRecord {
  order: Order
  userId: string
  cartId: string
  // When the simulated payment settles, and how
  settleAt: string
  outcome: 'confirmed' | 'refused'
}

export interface IdempotencyRecord {
  key: string
  userId: string
  fingerprint: string
  orderId: string
}

export interface MockState {
  schema: number
  seq: number
  nfts: NftRecord[]
  users: UserRecord[]
  sessions: SessionRecord[]
  favorites: Record<string, string[]>
  carts: CartRecord[]
  quotes: QuoteRecord[]
  connections: (WalletConnection & { userId: string })[]
  orders: OrderRecord[]
  idempotency: IdempotencyRecord[]
  wallets: Record<string, UserWallets>
}

// Bump when MockState changes shape: stored data from an older shape is discarded
const SCHEMA_VERSION = 1
const STORAGE_KEY = 'kurio:mock-db'
const MAX_QUOTES = 50

export function seedState(): MockState {
  const users = buildUserFixtures()
  return {
    schema: SCHEMA_VERSION,
    seq: 0,
    nfts: buildNftFixtures(),
    users,
    sessions: [],
    favorites: { 'user-nova': ['sage-nomad-009', 'golden-beat-207'], 'user-kai': [] },
    carts: users.map((user) => ({
      id: user.cartId,
      userId: user.id,
      items: [],
      couponCode: null,
      updatedAt: user.updatedAt,
    })),
    quotes: [],
    connections: [],
    orders: [],
    idempotency: [],
    wallets: buildWalletFixtures(),
  }
}

/**
 * Single source of truth for the simulated backend. Every REST handler reads and writes it,
 * and realtime events are published from the same mutations, so REST and Socket.IO never
 * disagree. Persisted to localStorage so refresh keeps the data; `reset()` restores the seed.
 */
export class MockDatabase {
  #state: MockState
  readonly #storage: KeyValueStorage

  constructor(storage: KeyValueStorage = createStorage()) {
    this.#storage = storage
    this.#state = this.#load() ?? seedState()
  }

  get state(): MockState {
    return this.#state
  }

  nextId(prefix: string): string {
    this.#state.seq += 1
    return `${prefix}_${this.#state.seq.toString(36).padStart(4, '0')}`
  }

  commit(): void {
    this.#state.quotes = this.#state.quotes.slice(-MAX_QUOTES)
    this.#storage.set(STORAGE_KEY, JSON.stringify(this.#state))
  }

  reset(): void {
    this.#state = seedState()
    this.commit()
  }

  #load(): MockState | null {
    const raw = this.#storage.get(STORAGE_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as MockState
      return parsed.schema === SCHEMA_VERSION ? parsed : null
    } catch {
      return null
    }
  }
}
