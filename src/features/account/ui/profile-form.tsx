import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { type Profile, type ProfileInput, profileInputSchema } from '@/domain/profile'
import { applyApiErrorToForm } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { EnsInput } from '@/shared/ui/ens-input'
import { FormAlert } from '@/shared/ui/form-alert'
import { FormField } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'

import { useUpdateProfile } from '../api/account-queries'
import { AvatarField } from './avatar-field'

const FIELDS = ['displayName', 'username', 'email', 'ensLabel', 'walletNickname'] as const

function toForm(profile: Profile): z.input<typeof profileInputSchema> {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensLabel: profile.ensLabel ?? '',
    walletNickname: profile.walletNickname,
  }
}

/** "Perfil do colecionador": two columns from md, one on mobile; avatar saves on its own. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof profileInputSchema>, unknown, ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: toForm(profile),
  })

  const submit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      const saved = await update.mutateAsync(input)
      reset(toForm(saved))
      toast.success('Perfil atualizado')
    } catch (error) {
      // Taken email/username (409) and validation (422) land on their fields
      setFormError(applyApiErrorToForm(error, { setError, fields: FIELDS }))
    }
  })

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby="profile-heading"
      className="flex flex-col gap-8"
    >
      <h2 id="profile-heading" className="text-16 font-bold md:text-17">
        Perfil do colecionador
      </h2>
      <FormAlert message={formError} />
      <div className="grid grid-cols-1 gap-x-7 gap-y-6 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(control) => <Input {...control} {...register('displayName')} autoComplete="name" />}
        </FormField>
        <FormField label="Nome de usuário" required error={errors.username?.message}>
          {(control) => (
            <Input
              {...control}
              {...register('username')}
              autoComplete="username"
              autoCapitalize="none"
            />
          )}
        </FormField>
        <FormField label="E-mail" required error={errors.email?.message}>
          {(control) => (
            <Input {...control} {...register('email')} type="email" autoComplete="email" />
          )}
        </FormField>
        <FormField label="Nome ENS" required error={errors.ensLabel?.message}>
          {(control) => <EnsInput {...control} {...register('ensLabel')} />}
        </FormField>
        <FormField label="Apelido da carteira" required error={errors.walletNickname?.message}>
          {(control) => <Input {...control} {...register('walletNickname')} />}
        </FormField>
        <AvatarField avatarUrl={profile.avatarUrl} />
      </div>
      <Button
        type="submit"
        disabled={update.isPending || !isDirty}
        className="w-full md:w-[8.2rem]"
      >
        {update.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}
