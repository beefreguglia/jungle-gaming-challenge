/**
 * Mock scenarios: each one is plain configuration read by the route wrapper (latency,
 * failures) and by services (session TTL, payment outcome, checkout disruptions).
 * Adding a scenario is adding an entry — nothing else changes.
 *
 * Select with `?scenario=<name>` (persisted) or `window.__kurioMock.setScenario(name)`.
 */

export interface FailureRule {
  methods: string[]
  // Matched against the path after the API base URL ("/nfts", "/favorites/")
  pathPrefix: string
  // HTTP status of the injected error, or "network" for a connection failure
  status: number | 'network'
  // Fail only the first N matching requests of the page load (omit = always)
  times?: number
}

export interface Scenario {
  name: string
  description: string
  latencyMs: { min: number; max: number }
  // Catalog responses alternate slow/fast so an older request can resolve last
  outOfOrder: boolean
  failures: FailureRule[]
  sessionTtlMs: number
  payment: { outcome: 'confirmed' | 'refused'; delayMs: number }
  // First POST /orders for an idempotency key creates the order but answers this late
  orderResponseDelayMs: number
  walletRejects: boolean
  // After a quote is issued, the first cart item changes price or sells out
  checkoutDisruption: 'none' | 'price' | 'sold-out'
  checkoutDisruptionDelayMs: number
  // Every realtime event is sent twice, followed by a stale copy
  duplicateEvents: boolean
  // Catalog search always comes back empty
  emptyCatalog: boolean
}

const HOUR = 60 * 60 * 1000

const base: Scenario = {
  name: 'default',
  description: 'Tudo funciona, com latência curta e estável',
  latencyMs: { min: 150, max: 350 },
  outOfOrder: false,
  failures: [],
  sessionTtlMs: 8 * HOUR,
  payment: { outcome: 'confirmed', delayMs: 2500 },
  orderResponseDelayMs: 0,
  walletRejects: false,
  checkoutDisruption: 'none',
  checkoutDisruptionDelayMs: 4000,
  duplicateEvents: false,
  emptyCatalog: false,
}

const variants: Record<string, Partial<Scenario> & { description: string }> = {
  instant: {
    description: 'Sem latência e pagamento rápido (testes automatizados)',
    latencyMs: { min: 0, max: 0 },
    payment: { outcome: 'confirmed', delayMs: 300 },
  },
  slow: {
    description: 'Rede lenta: 2 a 3 s por requisição (skeletons)',
    latencyMs: { min: 2000, max: 3000 },
  },
  'variable-latency': {
    description: 'Latência variável entre 100 ms e 1,5 s',
    latencyMs: { min: 100, max: 1500 },
  },
  'out-of-order': {
    description: 'Respostas do catálogo chegam fora de ordem',
    outOfOrder: true,
  },
  empty: {
    description: 'Catálogo sem resultados',
    emptyCatalog: true,
  },
  offline: {
    description: 'Sem conexão: toda requisição falha na rede',
    failures: [{ methods: ['*'], pathPrefix: '/', status: 'network' }],
  },
  'server-error': {
    description: 'Catálogo e detalhe respondem 500',
    failures: [{ methods: ['GET'], pathPrefix: '/nfts', status: 500 }],
  },
  flaky: {
    description: 'As 2 primeiras consultas ao catálogo falham com 503, depois recupera',
    failures: [{ methods: ['GET'], pathPrefix: '/nfts', status: 503, times: 2 }],
  },
  'favorite-fails': {
    description: 'Adicionar ou remover favorito falha com 500 (rollback otimista)',
    failures: [{ methods: ['PUT', 'DELETE'], pathPrefix: '/favorites/', status: 500 }],
  },
  unauthorized: {
    description: 'Rotas privadas respondem 403',
    failures: [{ methods: ['*'], pathPrefix: '/profile', status: 403 }],
  },
  'session-expires': {
    description: 'Sessões novas expiram após 30 s',
    sessionTtlMs: 30_000,
  },
  'price-change': {
    description: 'Preço do primeiro item do carrinho sobe 4 s após a cotação',
    checkoutDisruption: 'price',
  },
  'sold-out': {
    description: 'Primeiro item do carrinho esgota 4 s após a cotação',
    checkoutDisruption: 'sold-out',
  },
  'order-timeout': {
    description: 'Pedido é criado, mas a resposta demora 20 s (recuperação por idempotência)',
    orderResponseDelayMs: 20_000,
  },
  'payment-refused': {
    description: 'Pagamento recusado após a criação do pedido',
    payment: { outcome: 'refused', delayMs: 2500 },
  },
  'wallet-rejected': {
    description: 'A carteira recusa a conexão',
    walletRejects: true,
  },
  'duplicate-events': {
    description: 'Eventos em tempo real chegam duplicados e com cópias antigas',
    duplicateEvents: true,
  },
}

export const SCENARIOS: Record<string, Scenario> = {
  default: base,
  ...Object.fromEntries(
    Object.entries(variants).map(([name, variant]) => [name, { ...base, ...variant, name }]),
  ),
}

export const DEFAULT_SCENARIO = 'default'

export function getScenario(name: string | null | undefined): Scenario {
  return (name && SCENARIOS[name]) || base
}

export function isScenarioName(name: string): boolean {
  return name in SCENARIOS
}
