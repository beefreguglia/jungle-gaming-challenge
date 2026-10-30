import { Link, useNavigate } from '@tanstack/react-router'

import { safeRedirect } from '@/shared/lib/redirect'

import { AUTH_ROUTES, type AuthMode } from '../model/auth-route'
import { AuthPanel } from './auth-panel'

const HEADINGS: Record<AuthMode, string> = {
  'sign-in': 'Entrar',
  'sign-up': 'Criar perfil de colecionador',
}

const SWITCH: Record<AuthMode, { question: string; action: string; to: AuthMode }> = {
  'sign-in': { question: 'Novo na Kurio?', action: 'Crie uma conta', to: 'sign-up' },
  'sign-up': { question: 'Já tem uma conta?', action: 'Entre', to: 'sign-in' },
}

interface AuthPageProps {
  mode: AuthMode
  redirect?: string
}

/**
 * /login and /cadastro: full screen on mobile (Figma frames), the dialog's card centered on
 * the page from md up. Success resumes the flow that sent the user here (`?redirect=`).
 */
export function AuthPage({ mode, redirect }: AuthPageProps) {
  const navigate = useNavigate()
  const other = SWITCH[mode]

  function changeMode(next: AuthMode) {
    void navigate({ to: AUTH_ROUTES[next], search: { redirect }, replace: true })
  }

  return (
    <div className="mx-auto flex w-full max-w-[26rem] flex-col px-7 pt-32 pb-12 md:max-w-[31.25rem] md:px-0 md:py-16">
      <Link
        to="/"
        aria-label="Kurio, página inicial"
        className="mx-auto mb-20 text-32 font-bold tracking-[0.08em] md:hidden"
      >
        KURIO
      </Link>
      <div className="md:rounded-sm md:border-b-[6px] md:border-primary md:bg-card md:px-8 md:pt-12 md:pb-14 md:ring-1 md:ring-border-soft">
        <h1 className="mb-10 text-center text-title font-bold md:sr-only">{HEADINGS[mode]}</h1>
        <AuthPanel
          variant="page"
          mode={mode}
          onModeChange={changeMode}
          onSuccess={() => void navigate({ href: safeRedirect(redirect), replace: true })}
        />
      </div>
      <p className="mt-10 text-center text-body-lg text-muted-foreground md:hidden">
        {other.question}{' '}
        <Link
          to={AUTH_ROUTES[other.to]}
          search={{ redirect }}
          replace
          className="underline underline-offset-4 hover:text-accent-foreground"
        >
          {other.action}
        </Link>
      </p>
    </div>
  )
}
