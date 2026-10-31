import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { type PasswordForm as PasswordValues, passwordFormSchema } from '@/domain/profile'
import { applyApiErrorToForm } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { FormAlert } from '@/shared/ui/form-alert'
import { FormField } from '@/shared/ui/form-field'
import { PasswordInput } from '@/shared/ui/password-input'

import { useChangePassword } from '../api/account-queries'

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const
const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

/**
 * "Alterar senha". Its own form and button: it is an independent operation, so a failure
 * here never leaves the profile half saved (the Figma shows a single "Salvar").
 */
export function PasswordForm() {
  const change = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordFormSchema), defaultValues: EMPTY })

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null)
    try {
      await change.mutateAsync({ currentPassword, newPassword })
      reset(EMPTY)
      toast.success('Senha alterada')
    } catch (error) {
      // Wrong current password (422) goes to its field
      setFormError(applyApiErrorToForm(error, { setError, fields: FIELDS }))
    }
  })

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby="password-heading"
      className="flex flex-col gap-6 md:max-w-[26rem]"
    >
      <h2 id="password-heading" className="text-16 font-bold md:text-17">
        Alterar senha
      </h2>
      <FormAlert message={formError} />
      <FormField label="Senha atual" error={errors.currentPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...register('currentPassword')}
            autoComplete="current-password"
          />
        )}
      </FormField>
      <FormField
        label="Nova senha"
        hint="Pelo menos 8 caracteres, com letras e números"
        error={errors.newPassword?.message}
      >
        {(control) => (
          <PasswordInput {...control} {...register('newPassword')} autoComplete="new-password" />
        )}
      </FormField>
      <FormField label="Confirmar nova senha" error={errors.confirmPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...register('confirmPassword')}
            autoComplete="new-password"
          />
        )}
      </FormField>
      <Button type="submit" disabled={change.isPending} className="w-full md:w-fit md:px-6">
        {change.isPending ? 'Alterando…' : 'Alterar senha'}
      </Button>
    </form>
  )
}
