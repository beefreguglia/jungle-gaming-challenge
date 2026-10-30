import { Link } from '@tanstack/react-router'

import { Button } from '@/shared/ui/button'

export function RouteNotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-caption font-bold tracking-[0.2em] text-accent-foreground uppercase">
        Erro 404
      </p>
      <h1 className="text-heading font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço acessado não existe ou foi removido.</p>
      <Button asChild>
        <Link to="/">Voltar para o início</Link>
      </Button>
    </section>
  )
}
