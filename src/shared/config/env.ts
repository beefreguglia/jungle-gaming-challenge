import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().min(1).default('/api'),
  // Empty means "same origin as the page"
  VITE_SOCKET_URL: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  // On by default so a clean checkout and the demo deploy work without a .env; set false to
  // point the app at a real backend
  VITE_ENABLE_MOCKS: z.stringbool().default(true),
})

// Only the app's own keys: passing the whole `import.meta.env` would inline every VITE_*
// variable of the build host in the bundle (Vercel adds commit, author and project ids)
const parsed = envSchema.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
  VITE_ENABLE_MOCKS: import.meta.env.VITE_ENABLE_MOCKS,
})

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`)
}

export const env = {
  apiUrl: parsed.data.VITE_API_URL,
  socketUrl: parsed.data.VITE_SOCKET_URL,
  enableMocks: parsed.data.VITE_ENABLE_MOCKS,
  isDev: import.meta.env.DEV,
} as const
