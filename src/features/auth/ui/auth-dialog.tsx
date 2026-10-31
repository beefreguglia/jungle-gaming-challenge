import { useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { useRef } from 'react'

import { useSession } from '@/features/session'
import { safeRedirect } from '@/shared/lib/redirect'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'

import {
  AUTH_PARAM,
  type AuthMode,
  authModeOf,
  type AuthSearch,
  withoutAuthParams,
} from '../model/auth-route'
import { AuthPanel } from './auth-panel'

const HEADINGS: Record<AuthMode, string> = {
  'sign-in': 'Entrar',
  'sign-up': 'Criar perfil de colecionador',
}

const SWITCH: Record<AuthMode, { question: string; action: string; to: AuthMode }> = {
  'sign-in': { question: 'Novo na Kurio?', action: 'Crie uma conta', to: 'sign-up' },
  'sign-up': { question: 'Já tem uma conta?', action: 'Entre', to: 'sign-in' },
}

/**
 * Sign-in / sign-up dialog, open on any page while the URL has `?auth=entrar|cadastro`, so
 * private pages, the header, favorites and an expired session all lead here, and a refresh
 * keeps it open. Full screen on mobile (Figma login frames), a card from md up. Signing in
 * resumes `?redirect=` or simply closes over the same page; a member never sees it.
 */
export function AuthDialog() {
  const search: AuthSearch = useSearch({ strict: false })
  const { href } = useLocation()
  const navigate = useNavigate()
  const { session } = useSession()
  const mode = authModeOf(search)

  // Without a trigger of its own, the dialog gives focus back to whatever opened it
  const opener = useRef<HTMLElement | null>(null)

  function leave(target: string) {
    void navigate({ href: target, replace: true })
  }

  function changeMode(next: AuthMode) {
    void navigate({
      to: '.',
      search: (previous: AuthSearch) => ({ ...previous, auth: AUTH_PARAM[next] }),
      replace: true,
    })
  }

  const open = mode !== null && !session
  const shown = mode ?? 'sign-in'
  const other = SWITCH[shown]

  return (
    <Dialog open={open} onOpenChange={(next) => !next && leave(withoutAuthParams(href))}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (opener.current?.isConnected) opener.current.focus()
        }}
        className="inset-0 block h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none bg-background px-7 pt-24 pb-12 ring-0 sm:max-w-none md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-[31.25rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sm md:border-b-[6px] md:border-primary md:bg-card md:px-8 md:pt-12 md:pb-14 md:ring-1 [&>[data-slot=dialog-close]]:text-accent-foreground"
      >
        <div className="mx-auto w-full max-w-[26rem] md:max-w-none">
          <p
            aria-hidden="true"
            className="mb-20 text-center text-32 font-bold tracking-[0.08em] md:hidden"
          >
            KURIO
          </p>
          <DialogTitle className="mb-10 text-center text-title font-bold md:sr-only">
            {HEADINGS[shown]}
          </DialogTitle>
          <AuthPanel
            mode={shown}
            onModeChange={changeMode}
            onSuccess={() => leave(safeRedirect(search.redirect, withoutAuthParams(href)))}
          />
          <p className="mt-10 text-center text-body-lg text-muted-foreground md:hidden">
            {other.question}{' '}
            <button
              type="button"
              onClick={() => changeMode(other.to)}
              className="underline underline-offset-4 hover:text-accent-foreground"
            >
              {other.action}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
