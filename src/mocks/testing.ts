import { vi } from 'vitest'

import type { Backend } from './backend'
import { MockDatabase } from './db/database'
import { createMemoryStorage } from './db/storage'
import { getScenario, type Scenario } from './scenarios'

/** Backend over a fresh in-memory database, with realtime publishes captured by spies. */
export function createTestBackend(overrides: Partial<Scenario> = {}) {
  const scenario = { ...getScenario('instant'), ...overrides }
  const realtime = { publishNft: vi.fn(), publishOrder: vi.fn() }
  const backend: Backend = {
    db: new MockDatabase(createMemoryStorage()),
    realtime,
    scenario: () => scenario,
    now: () => new Date(),
  }
  return { backend, realtime, scenario }
}
