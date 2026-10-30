import type { MockDatabase, OrderRecord } from './db/database'
import type { NftRecord } from './fixtures/nfts'
import type { Scenario } from './scenarios'

/** Side channel used by services to announce changes; implemented by the realtime hub. */
export interface RealtimePublisher {
  publishNft(nft: NftRecord): void
  publishOrder(record: OrderRecord): void
}

/** Everything a mock service needs. Tests build one with an in-memory database. */
export interface Backend {
  db: MockDatabase
  realtime: RealtimePublisher
  scenario: () => Scenario
  now: () => Date
}
