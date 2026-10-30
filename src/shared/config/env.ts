import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().min(1).default('/api'),
  // Empty means "same origin as the page"
  VITE_SOCKET_URL: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  VITE_ENABLE_MOCKS: z.stringbool().default(false),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`)
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
  socketUrl: parsed.data.VITE_SOCKET_URL,
  enableMocks: parsed.data.VITE_ENABLE_MOCKS,
  isDev: import.meta.env.DEV,
} as const
