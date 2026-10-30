import { env } from '@/shared/config/env'

/** Starts the MSW network layer before the first request when mocks are enabled. */
export async function enableMocking(): Promise<void> {
  if (!env.enableMocks) return

  // Dynamic import keeps MSW out of the bundle when mocks are disabled
  const { startMockWorker } = await import('@/mocks/browser')
  await startMockWorker({ quiet: !env.isDev })
}
