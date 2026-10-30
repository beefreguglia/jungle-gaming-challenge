import { setupWorker } from 'msw/browser'

import { env } from '@/shared/config/env'

import { createMockServer, type MockControl } from './server'

declare global {
  interface Window {
    __kurioMock?: MockControl
  }
}

interface StartOptions {
  quiet?: boolean
}

function socketOrigin(): string {
  return (env.socketUrl ?? window.location.origin).replace(/^http/, 'ws')
}

/**
 * URL switches for demos and manual testing, removed from the address bar afterwards:
 * `?scenario=<name>` selects (and remembers) a scenario, `?mock-reset` restores the seed.
 */
function applyUrlSwitches(control: MockControl): void {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('scenario')
  if (scenario) control.setScenario(scenario)
  if (url.searchParams.has('mock-reset')) control.reset()

  if (scenario || url.searchParams.has('mock-reset')) {
    url.searchParams.delete('scenario')
    url.searchParams.delete('mock-reset')
    window.history.replaceState(window.history.state, '', url)
  }
}

export async function startMockWorker({ quiet = false }: StartOptions = {}): Promise<MockControl> {
  const { handlers, control } = createMockServer({
    apiBase: env.apiUrl,
    socketOrigin: socketOrigin(),
  })
  applyUrlSwitches(control)

  await setupWorker(...handlers).start({
    quiet,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    // Assets, fonts and the Vite client go straight to the network
    onUnhandledRequest: 'bypass',
  })
  // Published only once requests are intercepted: tests wait on it as the "mocks ready" signal
  window.__kurioMock = control
  return control
}
