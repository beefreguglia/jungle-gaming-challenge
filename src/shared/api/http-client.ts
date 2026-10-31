import axios from 'axios'
import type { ZodType } from 'zod'

import { AUTH_HEADER } from '@/domain/api-contract'

import { ApiError, toApiError } from './api-error'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions<T> {
  params?: Record<string, unknown>
  headers?: Record<string, string>
  signal?: AbortSignal
  // Overrides the client timeout for this request (e.g. give up on a slow order sooner)
  timeoutMs?: number
  // Validates the response body; the result type is inferred from the schema
  schema?: ZodType<T>
}

interface RequestConfig<T> extends RequestOptions<T> {
  method: Method
  url: string
  body?: unknown
}

/**
 * Transport port used by features. Axios stays an implementation detail of this module,
 * so features never depend on its types.
 */
export interface HttpClient {
  request<T>(config: RequestConfig<T>): Promise<T>
  get<T>(url: string, options?: RequestOptions<T>): Promise<T>
  post<T>(url: string, body?: unknown, options?: RequestOptions<T>): Promise<T>
  put<T>(url: string, body?: unknown, options?: RequestOptions<T>): Promise<T>
  patch<T>(url: string, body?: unknown, options?: RequestOptions<T>): Promise<T>
  delete<T>(url: string, options?: RequestOptions<T>): Promise<T>
}

type HeaderValues = Record<string, string | null | undefined>

export interface HttpErrorContext {
  // Whether the failed request carried credentials: a 401 then means the session ended
  sentAuthorization: boolean
}

interface HttpClientOptions {
  baseURL: string
  timeoutMs?: number
  // Evaluated on every request (session token, visitor cart id); null/undefined are skipped
  headers?: () => HeaderValues
  // Observes every normalized failure; used by the app to react to expired sessions
  onError?: (error: ApiError, context: HttpErrorContext) => void
}

function compactHeaders(...sources: (HeaderValues | undefined)[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const source of sources) {
    for (const [name, value] of Object.entries(source ?? {})) {
      if (value != null) result[name] = value
    }
  }
  return result
}

const DEFAULT_TIMEOUT_MS = 15_000

function parseBody<T>(data: unknown, schema: ZodType<T> | undefined): T {
  if (!schema) return data as T

  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiError({
      kind: 'contract',
      message: 'Response does not match the expected contract',
      cause: result.error,
    })
  }
  return result.data
}

export function createHttpClient({
  baseURL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  headers: dynamicHeaders,
  onError,
}: HttpClientOptions): HttpClient {
  const instance = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: { Accept: 'application/json' },
    // Arrays as repeated keys (`collections=a&collections=b`), the API's query contract
    paramsSerializer: { indexes: null },
  })

  async function request<T>({
    method,
    url,
    body,
    params,
    headers,
    signal,
    timeoutMs: requestTimeoutMs,
    schema,
  }: RequestConfig<T>) {
    // Explicit per-request headers win over the dynamic ones
    const finalHeaders = compactHeaders(dynamicHeaders?.(), headers)
    try {
      const response = await instance.request<unknown>({
        method,
        url,
        data: body,
        params,
        headers: finalHeaders,
        signal,
        timeout: requestTimeoutMs,
      })
      return parseBody(response.data, schema)
    } catch (error) {
      const apiError = toApiError(error)
      onError?.(apiError, { sentAuthorization: AUTH_HEADER in finalHeaders })
      throw apiError
    }
  }

  return {
    request,
    get: (url, options) => request({ ...options, method: 'GET', url }),
    post: (url, body, options) => request({ ...options, method: 'POST', url, body }),
    put: (url, body, options) => request({ ...options, method: 'PUT', url, body }),
    patch: (url, body, options) => request({ ...options, method: 'PATCH', url, body }),
    delete: (url, options) => request({ ...options, method: 'DELETE', url }),
  }
}
