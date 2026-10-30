import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/conta/favoritos')({
  component: FavoritesPage,
})

// "Lista de interesse": favorited NFTs grid, built with the favorites slice (Fase 5.3)
function FavoritesPage() {
  return <h2 className="text-title font-bold">Lista de interesse</h2>
}
