import { delay, http, HttpResponse, type HttpHandler } from 'msw'

import { AUTH_HEADER } from '@/domain/api-contract'
import { API_ERROR_CODES } from '@/domain/errors'

import type { Backend } from '../backend'
import type { FailureRule, Scenario } from '../scenarios'
import { MockApiError } from './errors'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

export interface RouteContext {
  request: Request
  params: Record<string, string>
  backend: Backend
  authorization: string | null
  body: () => Promise<unknown>
}

type Resolver = (context: RouteContext) => Response | Promise<Response>

export type RouteFn = (method: Method, path: string, resolve: Resolver) => HttpHandler

const PARAM = '__param__'

/** Turns an API_PATHS builder into an MSW pattern: (id) => `/nfts/${id}` → "/nfts/:id". */
export function pattern(build: (value: string) => string, name: string): string {
  return build(PARAM).replace(PARAM, `:${name}`)
}

// Deterministic PRNG (mulberry32): "variable" latency is the same sequence on every run
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STATUS_CODES: Record<number, string> = {
  403: API_ERROR_CODES.forbidden,
  404: API_ERROR_CODES.notFound,
}

function injectedFailure(rule: FailureRule): Response {
  if (rule.status === 'network') return HttpResponse.error()
  const code = STATUS_CODES[rule.status] ?? API_ERROR_CODES.transient
  return HttpResponse.json(
    { error: { code, message: 'Falha simulada pelo cenário de mocks' } },
    { status: rule.status },
  )
}

/**
 * Wraps every REST handler with the scenario's network behavior (latency, out-of-order,
 * injected failures) and maps MockApiError to the error envelope. Handlers only describe
 * the happy path of their resource.
 */
export function createRoute(backend: Backend, apiBase: string): RouteFn {
  const random = seededRandom(2026)
  const failureCounts = new Map<FailureRule, number>()
  let catalogRequests = 0

  function latencyFor(scenario: Scenario, method: Method, path: string): number {
    if (scenario.outOfOrder && method === 'get' && path === '/nfts') {
      catalogRequests += 1
      return catalogRequests % 2 === 1 ? 1500 : 150
    }
    const { min, max } = scenario.latencyMs
    return Math.round(min + random() * (max - min))
  }

  function matchFailure(scenario: Scenario, method: Method, path: string): FailureRule | null {
    const rule = scenario.failures.find(
      (item) =>
        (item.methods.includes('*') || item.methods.includes(method.toUpperCase())) &&
        path.startsWith(item.pathPrefix),
    )
    if (!rule) return null
    const count = (failureCounts.get(rule) ?? 0) + 1
    failureCounts.set(rule, count)
    return rule.times === undefined || count <= rule.times ? rule : null
  }

  return (method, path, resolve) =>
    http[method](`${apiBase}${path}`, async ({ request, params }) => {
      const scenario = backend.scenario()
      await delay(latencyFor(scenario, method, path))

      // The route pattern ("/favorites/:nftId") is matched, so prefixes like "/favorites/" work
      const failure = matchFailure(scenario, method, path)
      if (failure) return injectedFailure(failure)

      try {
        return await resolve({
          request,
          params: params as Record<string, string>,
          backend,
          authorization: request.headers.get(AUTH_HEADER),
          body: () =>
            request
              .clone()
              .json()
              .catch(() => undefined),
        })
      } catch (error) {
        if (error instanceof MockApiError) {
          return HttpResponse.json(error.toBody(), { status: error.status })
        }
        console.error('[mocks] Unhandled error in handler', error)
        return HttpResponse.json(
          { error: { code: API_ERROR_CODES.transient, message: 'Erro interno simulado' } },
          { status: 500 },
        )
      }
    })
}
