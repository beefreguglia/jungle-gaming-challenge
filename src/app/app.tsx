import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Toaster } from 'sonner'

import { createHttpClient } from '@/shared/api'
import { env } from '@/shared/config/env'

import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

const QueryDevtools = env.isDev
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null

const queryClient = createQueryClient()
const http = createHttpClient({ baseURL: env.apiUrl })
const router = createAppRouter({ queryClient, http })

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
      <Suspense>
        <QueryDevtools />
      </Suspense>
    </QueryClientProvider>
  )
}
