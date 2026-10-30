import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

import { isApiError } from '@/shared/api'
import { Button } from '@/shared/ui/button'

function describe(error: unknown): string {
  if (isApiError(error) && (error.kind === 'network' || error.kind === 'timeout')) {
    return 'Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.'
  }
  if (isApiError(error) && error.kind === 'transient') {
    return 'O serviço está instável no momento. Tente de novo em instantes.'
  }
  return 'Não foi possível carregar esta página.'
}

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
      <h1 className="text-heading font-bold">Algo deu errado</h1>
      <p className="text-muted-foreground">{describe(error)}</p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="max-w-full overflow-auto text-caption text-subtle">{error.message}</pre>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => void router.invalidate()}>Tentar novamente</Button>
        <Button asChild variant="outline">
          <Link to="/">Ir para o início</Link>
        </Button>
      </div>
    </section>
  )
}
