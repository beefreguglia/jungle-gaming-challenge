import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'

import {
  type Session,
  type SignUpForm as SignUpValues,
  signUpFormSchema,
  toSignUpInput,
} from '@/domain/auth'
import { applyApiErrorToForm } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { FormAlert } from '@/shared/ui/form-alert'
import { FormField } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { PasswordInput } from '@/shared/ui/password-input'

import { useSignUp } from '../api/auth-mutations'
import { authFieldClass, authSubmitClass, type AuthVariant } from './auth-styles'

// Fields the API can reject (taken email/username, server-side validation)
const FIELDS = ['username', 'email', 'password'] as const

interface SignUpFormProps {
  variant: AuthVariant
  onSuccess: (session: Session) => void
}

export function SignUpForm({ variant, onSuccess }: SignUpFormProps) {
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
  const fieldClass = authFieldClass[variant]

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      onSuccess(await signUp.mutateAsync(toSignUpInput(values)))
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
            className={fieldClass}
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
            className={fieldClass}
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
            className={fieldClass}
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
            className={fieldClass}
          />
        )}
      </FormField>
      <FormAlert message={formError} />
      <Button type="submit" disabled={signUp.isPending} className={authSubmitClass[variant]}>
        {signUp.isPending ? 'Criando perfil…' : 'Criar perfil'}
      </Button>
    </form>
  )
}
