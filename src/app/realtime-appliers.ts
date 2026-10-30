import { catalogRealtimeApplier } from '@/features/catalog'
import { nftDetailRealtimeApplier } from '@/features/nft-detail'
import type { RealtimeApplier } from '@/shared/api'

/**
 * Event → cache appliers exported by features (catalog, nft detail, cart, orders).
 * Each vertical slice adds its own entry here as it lands.
 */
export const REALTIME_APPLIERS: readonly RealtimeApplier[] = [
  catalogRealtimeApplier,
  nftDetailRealtimeApplier,
]
