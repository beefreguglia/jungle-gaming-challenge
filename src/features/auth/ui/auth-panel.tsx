import { Tabs as TabsPrimitive } from 'radix-ui'

import type { AuthMode } from '../model/auth-route'
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
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSuccess: () => void
}

/**
 * "Entrar | Criar conta" switch, the form of the active mode and the social options. The
 * switch and subtitle show from md up: the mobile frames use a heading and a link at the
 * bottom instead.
 */
export function AuthPanel({ mode, onModeChange, onSuccess }: AuthPanelProps) {
  return (
    <TabsPrimitive.Root value={mode} onValueChange={(value) => onModeChange(value as AuthMode)}>
      <TabsPrimitive.List
        aria-label="Acesso à conta"
        className="hidden items-center justify-center gap-2 md:flex"
      >
        <TabsPrimitive.Trigger value="sign-in" className={tabClass}>
          Entrar
        </TabsPrimitive.Trigger>
        <span aria-hidden="true" className="h-5 w-px bg-primary" />
        <TabsPrimitive.Trigger value="sign-up" className={tabClass}>
          Criar conta
        </TabsPrimitive.Trigger>
      </TabsPrimitive.List>
      <p className="mx-auto mt-6 mb-8 hidden max-w-[21.25rem] text-center text-13 leading-5 md:block">
        {SUBTITLES[mode]}
      </p>
      <div className="mx-auto flex flex-col gap-8 md:max-w-[21.25rem]">
        <TabsPrimitive.Content value="sign-in" tabIndex={-1} className="outline-none">
          <SignInForm onSuccess={onSuccess} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="sign-up" tabIndex={-1} className="outline-none">
          <SignUpForm onSuccess={onSuccess} />
        </TabsPrimitive.Content>
        <SocialSignIn />
      </div>
    </TabsPrimitive.Root>
  )
}
