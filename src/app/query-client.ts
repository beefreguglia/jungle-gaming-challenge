import { QueryClient } from '@tanstack/react-query'

import { isApiError } from '@/shared/api'

const MAX_QUERY_RETRIES = 2
const MAX_RETRY_DELAY_MS = 8_000

/**
 * Cache policy (details in ARCHITECTURE.md → "Cache, retries e sincronização"):
 * - Data is fresh for 30 s by default; resources kept live by Socket.IO override it.
 * - Only transient failures (5xx, 408/429, network, timeout) are retried, with backoff;
 *   4xx are final answers and surface immediately.
 * - Mutations never retry on their own: order creation recovers through idempotency keys.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) =>
          isApiError(error) && error.isRetryable && failureCount < MAX_QUERY_RETRIES,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS),
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
