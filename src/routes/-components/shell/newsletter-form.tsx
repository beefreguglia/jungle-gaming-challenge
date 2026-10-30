import { useId } from 'react'
import { toast } from 'sonner'

/**
 * "Antecipe-se ao próximo lançamento". Newsletter signup is outside the delivered scope,
 * so submitting says so plainly instead of pretending the email was registered.
 */
export function NewsletterForm() {
  const inputId = useId()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    toast.info('Newsletter em breve', {
      description: 'As inscrições ainda não estão abertas nesta versão. Nenhum e-mail foi salvo.',
    })
  }

  return (
    <form onSubmit={submit} aria-labelledby={`${inputId}-title`}>
      <h2 id={`${inputId}-title`} className="mb-4 text-body-lg leading-tight font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <div className="mb-3 flex">
        <label htmlFor={inputId} className="sr-only">
          Seu e-mail
        </label>
        <input
          id={inputId}
          type="email"
          placeholder="digite seu e-mail..."
          className="h-10 min-w-0 flex-1 rounded-l-sm bg-secondary px-3 text-body placeholder:text-subtle"
        />
        <button
          type="submit"
          className="h-10 rounded-r-sm bg-primary px-3 text-body-lg font-bold text-primary-foreground hover:bg-accent-foreground"
        >
          Enviar
        </button>
      </div>
      <p className="text-caption text-subtle">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}
