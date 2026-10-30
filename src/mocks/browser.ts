import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

interface StartOptions {
  quiet?: boolean
}

export async function startMockWorker({ quiet = false }: StartOptions = {}): Promise<void> {
  await worker.start({
    quiet,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    // Assets, fonts and the Vite client go straight to the network
    onUnhandledRequest: 'bypass',
  })
}
