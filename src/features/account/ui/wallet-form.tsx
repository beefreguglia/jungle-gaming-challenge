import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type Control, Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { NFT_NETWORKS } from '@/domain/nft'
import {
  type Wallet,
  type WalletInput,
  walletInputSchema,
  WALLET_PROVIDER_LABEL,
  WALLET_PROVIDERS,
} from '@/domain/wallet'
import { NETWORK_LABEL } from '@/features/catalog'
import { applyApiErrorToForm } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { EnsInput } from '@/shared/ui/ens-input'
import { FormAlert } from '@/shared/ui/form-alert'
import { type FieldControlProps, FormField } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

type FormValues = z.input<typeof walletInputSchema>

const FIELDS = [
  'displayName',
  'nickname',
  'network',
  'profileName',
  'address',
  'alternateAddress',
  'provider',
  'referralCode',
  'email',
  'ensLabel',
] as const

// Selects start empty, as in the Figma ("Selecione uma rede")
const EMPTY: FormValues = {
  displayName: '',
  nickname: '',
  network: '' as FormValues['network'],
  profileName: '',
  address: '',
  alternateAddress: '',
  provider: '' as FormValues['provider'],
  referralCode: '',
  email: '',
  ensLabel: '',
}

function toForm(wallet: Wallet | null): FormValues {
  if (!wallet) return EMPTY
  const { id: _id, slot: _slot, sameAsPrimary: _same, updatedAt: _at, ...fields } = wallet
  return { ...EMPTY, ...fields, alternateAddress: fields.alternateAddress ?? '' }
}

interface EnumSelectProps {
  name: 'network' | 'provider'
  control: Control<FormValues, unknown, WalletInput>
  fieldProps: FieldControlProps
  placeholder: string
  options: { value: string; label: string }[]
}

/** Radix Select bound to the form; the trigger gets the FormField wiring (id, aria-*). */
function EnumSelect({ name, control, fieldProps, placeholder, options }: EnumSelectProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value || undefined} onValueChange={field.onChange}>
          <SelectTrigger {...fieldProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  )
}

const NETWORK_OPTIONS = NFT_NETWORKS.map((value) => ({ value, label: NETWORK_LABEL[value] }))
const PROVIDER_OPTIONS = WALLET_PROVIDERS.map((value) => ({
  value,
  label: WALLET_PROVIDER_LABEL[value],
}))

interface WalletFormProps {
  // Fills the fields (existing wallet or a copy of the primary one)
  initial: Wallet | null
  submitLabel: string
  onSave: (input: WalletInput) => Promise<unknown>
}

/** Fields of the Figma "Carteiras" frame; the address format follows the chosen network. */
export function WalletForm({ initial, submitLabel, onSave }: WalletFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    control: formControl,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, WalletInput>({
    resolver: zodResolver(walletInputSchema),
    defaultValues: toForm(initial),
  })

  const submit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      await onSave({ ...input, alternateAddress: input.alternateAddress || undefined })
      reset(undefined, { keepValues: true })
      toast.success('Carteira salva')
    } catch (error) {
      setFormError(applyApiErrorToForm(error, { setError, fields: FIELDS }))
    }
  })

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <FormAlert message={formError} />
      <div className="grid grid-cols-1 gap-x-7 gap-y-5 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(control) => <Input {...control} {...register('displayName')} autoComplete="name" />}
        </FormField>
        <FormField label="Apelido da carteira" required error={errors.nickname?.message}>
          {(control) => <Input {...control} {...register('nickname')} />}
        </FormField>
        <FormField label="Rede" required error={errors.network?.message}>
          {(control) => (
            <EnumSelect
              name="network"
              control={formControl}
              fieldProps={control}
              placeholder="Selecione uma rede"
              options={NETWORK_OPTIONS}
            />
          )}
        </FormField>
        <FormField label="Nome do perfil" required error={errors.profileName?.message}>
          {(control) => <Input {...control} {...register('profileName')} />}
        </FormField>
        <FormField label="Endereço da carteira" required error={errors.address?.message}>
          {(control) => (
            <Input
              {...control}
              {...register('address')}
              placeholder="Endereço 0x da carteira"
              spellCheck={false}
              autoCapitalize="none"
            />
          )}
        </FormField>
        <FormField
          label="ENS ou carteira secundária (opcional)"
          error={errors.alternateAddress?.message}
        >
          {(control) => (
            <Input
              {...control}
              {...register('alternateAddress')}
              spellCheck={false}
              autoCapitalize="none"
            />
          )}
        </FormField>
        <FormField label="Tipo de carteira" required error={errors.provider?.message}>
          {(control) => (
            <EnumSelect
              name="provider"
              control={formControl}
              fieldProps={control}
              placeholder="Selecione uma carteira"
              options={PROVIDER_OPTIONS}
            />
          )}
        </FormField>
        <FormField label="Código de indicação" required error={errors.referralCode?.message}>
          {(control) => (
            <Input {...control} {...register('referralCode')} autoCapitalize="characters" />
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
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full md:w-fit md:px-4">
        {isSubmitting ? 'Salvando…' : submitLabel}
      </Button>
    </form>
  )
}
