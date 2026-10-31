import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { type SignInInput, signInInputSchema } from '@/domain/auth'
import { applyApiErrorToForm } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { ComingSoon } from '@/shared/ui/coming-soon'
import { FormAlert } from '@/shared/ui/form-alert'
import { FormField } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { PasswordInput } from '@/shared/ui/password-input'

import { useSignIn } from '../api/auth-mutations'
import { authFieldClass, authSubmitClass } from './auth-styles'

const FIELDS = ['email', 'password'] as const

export function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const signIn = useSignIn()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<typeof signInInputSchema>, unknown, SignInInput>({
    resolver: zodResolver(signInInputSchema),
    defaultValues: { email: '', password: '' },
  })

  const submit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      await signIn.mutateAsync(input)
      onSuccess()
    } catch (error) {
      setFormError(applyApiErrorToForm(error, { setError, fields: FIELDS }))
    }
  })

  return (
    <form noValidate onSubmit={submit} aria-label="Entrar" className="flex flex-col gap-3">
      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="contato@email.com"
            className={authFieldClass}
          />
        )}
      </FormField>
      <FormField label="Senha" hideLabel error={errors.password?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...register('password')}
            autoComplete="current-password"
            placeholder="Senha"
            className={authFieldClass}
          />
        )}
      </FormField>
      <ComingSoon
        reason="Recuperação de senha em breve"
        className="self-end text-body text-accent-foreground md:text-caption"
      >
        Esqueceu a senha?
      </ComingSoon>
      <FormAlert message={formError} />
      <Button type="submit" variant="cta" disabled={signIn.isPending} className={authSubmitClass}>
        {signIn.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
