import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { type ErrorComponentProps, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrorBoundary = useQueryErrorResetBoundary()

  // Lets suspense queries refetch when the route is retried
  useEffect(() => {
    queryErrorBoundary.reset()
  }, [queryErrorBoundary])

  return (
    <section
      role="alert"
      className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center"
    >
      <h1 className="font-heading text-3xl font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        {import.meta.env.DEV && error instanceof Error
          ? error.message
          : 'Não foi possível carregar esta página.'}
      </p>
      <button
        type="button"
        onClick={() => void router.invalidate()}
        className="rounded-md border px-4 py-2 font-medium"
      >
        Tentar novamente
      </button>
    </section>
  )
}
