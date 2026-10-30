import { QueryClient } from '@tanstack/react-query'

import { isApiError } from '@/shared/api'

const MAX_QUERY_RETRIES = 2

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Only transient/network/timeout failures are retried; 4xx are final answers
        retry: (failureCount, error) =>
          isApiError(error) && error.isRetryable && failureCount < MAX_QUERY_RETRIES,
      },
      mutations: {
        // Never retry writes blindly: order creation relies on idempotency keys instead
        retry: false,
      },
    },
  })
}
