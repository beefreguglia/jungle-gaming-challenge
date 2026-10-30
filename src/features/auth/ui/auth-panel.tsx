import { Tabs as TabsPrimitive } from 'radix-ui'

import type { Session } from '@/domain/auth'
import { cn } from '@/shared/lib/utils'

import type { AuthMode } from '../model/auth-route'
import type { AuthVariant } from './auth-styles'
import { SignInForm } from './sign-in-form'
import { SignUpForm } from './sign-up-form'
import { SocialSignIn } from './social-sign-in'

const SUBTITLES: Record<AuthMode, string> = {
  'sign-in': 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  'sign-up': 'Crie seu perfil de colecionador para comprar, favoritar e acompanhar pedidos.',
}

const tabClass =
  'rounded-sm px-1 text-title font-medium text-foreground transition-colors hover:text-accent-foreground data-[state=active]:text-accent-foreground'

interface AuthPanelProps {
  variant: AuthVariant
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSuccess: (session: Session) => void
}

/**
 * "Entrar | Criar conta" switch, the form of the active mode and the social options. On
 * the auth pages the switch only shows from md up: the mobile frames use a heading and a
 * link at the bottom instead.
 */
export function AuthPanel({ variant, mode, onModeChange, onSuccess }: AuthPanelProps) {
  const onPage = variant === 'page'

  return (
    <TabsPrimitive.Root value={mode} onValueChange={(value) => onModeChange(value as AuthMode)}>
      <TabsPrimitive.List
        aria-label="Acesso à conta"
        className={cn('flex items-center justify-center gap-2', onPage && 'hidden md:flex')}
      >
        <TabsPrimitive.Trigger value="sign-in" className={tabClass}>
          Entrar
        </TabsPrimitive.Trigger>
        <span aria-hidden="true" className="h-5 w-px bg-primary" />
        <TabsPrimitive.Trigger value="sign-up" className={tabClass}>
          Criar conta
        </TabsPrimitive.Trigger>
      </TabsPrimitive.List>
      <p
        className={cn(
          'mx-auto mt-6 mb-8 max-w-[21.25rem] text-center text-13 leading-5',
          onPage && 'hidden md:block',
        )}
      >
        {SUBTITLES[mode]}
      </p>
      <div
        className={cn(
          'mx-auto flex flex-col gap-8',
          onPage ? 'md:max-w-[21.25rem]' : 'max-w-[21.25rem]',
        )}
      >
        <TabsPrimitive.Content value="sign-in" tabIndex={-1} className="outline-none">
          <SignInForm variant={variant} onSuccess={onSuccess} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="sign-up" tabIndex={-1} className="outline-none">
          <SignUpForm variant={variant} onSuccess={onSuccess} />
        </TabsPrimitive.Content>
        <SocialSignIn />
      </div>
    </TabsPrimitive.Root>
  )
}
