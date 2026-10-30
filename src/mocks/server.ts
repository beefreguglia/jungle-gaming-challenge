import { type RequestHandler, ws, type WebSocketHandler } from 'msw'

import type { Eth } from '@/domain/money'

import type { Backend } from './backend'
import { MockDatabase } from './db/database'
import { createStorage, type KeyValueStorage } from './db/storage'
import { accountHandlers } from './handlers/account'
import { authHandlers } from './handlers/auth'
import { cartHandlers } from './handlers/cart'
import { catalogHandlers } from './handlers/catalog'
import { checkoutHandlers } from './handlers/checkout'
import { createRoute } from './lib/route'
import { createRealtimeHub, type RealtimeHub } from './realtime/hub'
import { DEFAULT_SCENARIO, getScenario, isScenarioName, SCENARIOS } from './scenarios'
import { updateEdition } from './services/catalog'
import { rearmCheckoutDisruption, scheduleSettlement, settleDueOrders } from './services/checkout'
import { expireAllSessions, optionalUser } from './services/session'

const SCENARIO_KEY = 'kurio:mock-scenario'

/**
 * Imperative handle over the simulated backend, exposed as `window.__kurioMock`. Playwright
 * drives time-sensitive cases through it (price changes, expiry, disconnects) instead of
 * waiting on timers; the demo panel uses the same calls.
 */
export interface MockControl {
  readonly scenario: string
  readonly scenarios: { name: string; description: string }[]
  setScenario(name: string): void
  reset(): void
  updateEdition(
    target: { nftId: string; editionId: string },
    patch: { price?: Eth; available?: number },
  ): void
  expireSessions(): void
  disconnectRealtime(): void
  replayLastEvent(): void
  settleOrders(): void
}

interface MockServerOptions {
  apiBase: string
  // ws:// or wss:// origin the Socket.IO client connects to
  socketOrigin?: string
  storage?: KeyValueStorage
}

function resolveUserId(backend: Backend, token: string | null): string | null {
  if (!token) return null
  try {
    return optionalUser(backend, `Bearer ${token}`)?.id ?? null
  } catch {
    // Expired or unknown token: the socket only receives public events
    return null
  }
}

/**
 * MSW strips the "/socket.io/" path before matching, so the link is the bare origin. That
 * also catches other sockets on the origin (Vite HMR): anything that is not an Engine.IO
 * handshake is passed through to the real server untouched.
 */
function socketHandler(backend: Backend, hub: RealtimeHub, origin: string): WebSocketHandler {
  return ws.link(`${origin}/`).addEventListener('connection', (connection) => {
    if (!connection.client.url.searchParams.has('EIO')) {
      connection.server.connect()
      return
    }
    // Offline scenario: the transport fails like the REST calls do
    const offline = backend
      .scenario()
      .failures.some((rule) => rule.status === 'network' && rule.pathPrefix === '/')
    if (offline) {
      // Like a real dropped network: an "error" then the close. Socket.IO only reports
      // connect_error (and starts its backoff) for errors raised before the handshake
      setTimeout(() => {
        // `socket` exists at runtime (MSW itself dispatches errors on it) but is not typed
        const { socket } = connection.client as unknown as { socket: EventTarget }
        socket.dispatchEvent(new Event('error'))
        connection.client.close(4001, 'Simulated network failure')
      }, 0)
      return
    }
    hub.attach(connection)
  })
}

export function createMockServer({
  apiBase,
  socketOrigin,
  storage = createStorage(),
}: MockServerOptions) {
  // A stored name that no longer exists (renamed scenario) falls back to the default
  const stored = storage.get(SCENARIO_KEY)
  let scenarioName = stored && isScenarioName(stored) ? stored : DEFAULT_SCENARIO
  const db = new MockDatabase(storage)

  const backend: Backend = {
    db,
    scenario: () => getScenario(scenarioName),
    now: () => new Date(),
    // Replaced below once the hub exists; services only call it after startup
    realtime: { publishNft: () => {}, publishOrder: () => {} },
  }
  const hub = createRealtimeHub({
    scenario: backend.scenario,
    resolveUserId: (token) => resolveUserId(backend, token),
  })
  backend.realtime = hub

  // Orders left pending by a refresh: settle the overdue ones, re-arm timers for the rest
  settleDueOrders(backend)
  for (const record of db.state.orders) {
    if (record.order.status === 'pending') scheduleSettlement(backend, record)
  }

  const route = createRoute(backend, apiBase)
  const handlers: (RequestHandler | WebSocketHandler)[] = [
    ...authHandlers(route),
    ...catalogHandlers(route),
    ...cartHandlers(route),
    ...checkoutHandlers(route),
    ...accountHandlers(route),
    ...(socketOrigin ? [socketHandler(backend, hub, socketOrigin)] : []),
  ]

  const control: MockControl = {
    get scenario() {
      return scenarioName
    },
    scenarios: Object.values(SCENARIOS).map(({ name, description }) => ({ name, description })),
    setScenario(name) {
      if (!isScenarioName(name)) throw new Error(`Unknown mock scenario "${name}"`)
      scenarioName = name
      storage.set(SCENARIO_KEY, name)
      rearmCheckoutDisruption()
    },
    reset() {
      db.reset()
      rearmCheckoutDisruption()
    },
    updateEdition: (target, patch) => void updateEdition(backend, target, patch),
    expireSessions: () => expireAllSessions(backend),
    disconnectRealtime: () => hub.disconnectAll(),
    replayLastEvent: () => hub.replayLast(),
    settleOrders: () => settleDueOrders(backend),
  }

  return { backend, handlers, control }
}
