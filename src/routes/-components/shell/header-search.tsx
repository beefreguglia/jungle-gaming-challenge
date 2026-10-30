import { useNavigate } from '@tanstack/react-router'
import { SearchIcon, XIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

/** Header search: expands into a field and sends the term to the catalog (`/?q=`). */
export function HeaderSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = new FormData(event.currentTarget).get('q')?.toString().trim()
    void navigate({ to: '/', search: { q: q || undefined }, hash: 'catalogo' })
    setOpen(false)
  }

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Buscar NFTs"
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        <SearchIcon className="size-6" />
      </Button>
    )
  }

  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-1">
      <label htmlFor={inputId} className="sr-only">
        Buscar NFTs por nome, coleção ou criador
      </label>
      <Input
        ref={inputRef}
        id={inputId}
        name="q"
        type="search"
        placeholder="Buscar NFTs"
        className="h-9 w-40 lg:w-56"
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Fechar busca"
        onClick={() => setOpen(false)}
      >
        <XIcon />
      </Button>
    </form>
  )
}
