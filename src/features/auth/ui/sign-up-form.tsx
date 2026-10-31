import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import { type SignUpForm as SignUpValues, signUpFormSchema, toSignUpInput } from '@/domain/auth'
import { applyApiErrorToForm } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { FormAlert } from '@/shared/ui/form-alert'
import { FormField } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { PasswordInput } from '@/shared/ui/password-input'

import { useSignUp } from '../api/auth-mutations'
import { authFieldClass, authSubmitClass } from './auth-styles'

// Fields the API can reject (taken email/username, server-side validation)
const FIELDS = ['username', 'email', 'password'] as const

export function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const signUp = useSignUp()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<typeof signUpFormSchema>, unknown, SignUpValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await signUp.mutateAsync(toSignUpInput(values))
      onSuccess()
    } catch (error) {
      setFormError(applyApiErrorToForm(error, { setError, fields: FIELDS }))
    }
  })

  return (
    <form noValidate onSubmit={submit} aria-label="Criar conta" className="flex flex-col gap-3">
      <FormField
        label="Nome de usuário"
        hideLabel
        hint="3 a 20 caracteres: minúsculas, números e _"
        error={errors.username?.message}
      >
        {(control) => (
          <Input
            {...control}
            {...register('username')}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Nome de usuário"
            className={authFieldClass}
          />
        )}
      </FormField>
      <FormField label="E-mail" hideLabel error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="Digite seu e-mail"
            className={authFieldClass}
          />
        )}
      </FormField>
      <FormField
        label="Senha"
        hideLabel
        hint="Pelo menos 8 caracteres, com letras e números"
        error={errors.password?.message}
      >
        {(control) => (
          <PasswordInput
            {...control}
            {...register('password')}
            autoComplete="new-password"
            placeholder="Senha"
            className={authFieldClass}
          />
        )}
      </FormField>
      <FormField label="Confirmar senha" hideLabel error={errors.confirmPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...register('confirmPassword')}
            autoComplete="new-password"
            placeholder="Confirmar senha"
            className={authFieldClass}
          />
        )}
      </FormField>
      <FormAlert message={formError} />
      <Button type="submit" variant="cta" disabled={signUp.isPending} className={authSubmitClass}>
        {signUp.isPending ? 'Criando perfil…' : 'Criar perfil'}
      </Button>
    </form>
  )
}
