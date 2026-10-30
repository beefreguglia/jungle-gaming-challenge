import axios from 'axios'
import type { ZodType } from 'zod'

import { ApiError, toApiError } from './api-error'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions<T> {
  params?: Record<string, unknown>
  headers?: Record<string, string>
  signal?: AbortSignal
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

interface HttpClientOptions {
  baseURL: string
  timeoutMs?: number
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
}: HttpClientOptions): HttpClient {
  const instance = axios.create({
    baseURL,
    timeout: timeoutMs,
    headers: { Accept: 'application/json' },
  })

  async function request<T>({
    method,
    url,
    body,
    params,
    headers,
    signal,
    schema,
  }: RequestConfig<T>) {
    try {
      const response = await instance.request<unknown>({
        method,
        url,
        data: body,
        params,
        headers,
        signal,
      })
      return parseBody(response.data, schema)
    } catch (error) {
      throw toApiError(error)
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
