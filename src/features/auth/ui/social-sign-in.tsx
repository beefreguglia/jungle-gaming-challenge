import { GoogleIcon } from '@/shared/ui/brand-icon'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { FacebookIcon } from '@/shared/ui/icons'

const providerClass =
  'flex h-10 w-full items-center justify-center gap-3 rounded-button border border-border text-caption text-muted-foreground'

/**
 * "Ou continue com" from the Figma. Social sign-in is outside the delivered scope, so the
 * buttons explain that instead of pretending to authenticate.
 */
export function SocialSignIn() {
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-3 text-caption text-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        Ou continue com
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </p>
      <ComingSoon reason="Entrar com Google em breve" className={providerClass}>
        <GoogleIcon />
        Continuar com Google
      </ComingSoon>
      <ComingSoon reason="Entrar com Facebook em breve" className={providerClass}>
        <FacebookIcon className="text-facebook" />
        Continuar com Facebook
      </ComingSoon>
    </div>
  )
}
