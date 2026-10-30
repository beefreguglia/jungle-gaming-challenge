import { Link } from '@tanstack/react-router'

export function RouteNotFound() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">Erro 404</p>
      <h1 className="font-heading text-3xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço acessado não existe ou foi removido.</p>
      <Link to="/" className="font-medium underline underline-offset-4">
        Voltar para o início
      </Link>
    </section>
  )
}
