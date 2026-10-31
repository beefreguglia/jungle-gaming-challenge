import { type Control, Controller, type FieldErrors, type UseFormRegister } from 'react-hook-form'

import { NFT_NETWORKS } from '@/domain/nft'
import type { CheckoutDetails } from '@/domain/order'
import { NETWORK_LABEL } from '@/features/catalog'
import { EnsInput } from '@/shared/ui/ens-input'
import { FormField } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { OptionSelect } from '@/shared/ui/option-select'
import { Textarea } from '@/shared/ui/textarea'

import type { CheckoutValues } from '../model/checkout-values'

const NETWORK_OPTIONS = NFT_NETWORKS.map((value) => ({ value, label: NETWORK_LABEL[value] }))

interface CollectorFieldsProps {
  register: UseFormRegister<CheckoutValues>
  control: Control<CheckoutValues, unknown, CheckoutDetails>
  errors: FieldErrors<CheckoutValues>
}

/**
 * "Perfil do colecionador" (Figma Pagamento), one column on mobile and two from md. The
 * wallet type is picked in "Carteira e rede", next to the connection it drives.
 */
export function CollectorFields({ register, control, errors }: CollectorFieldsProps) {
  return (
    <section aria-labelledby="collector-heading" className="flex flex-col gap-5">
      <h2 id="collector-heading" className="text-16 font-bold md:text-17">
        Perfil do colecionador
      </h2>
      <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(field) => <Input {...field} {...register('displayName')} autoComplete="name" />}
        </FormField>
        <FormField label="Nome de usuário" required error={errors.username?.message}>
          {(field) => (
            <Input
              {...field}
              {...register('username')}
              autoComplete="username"
              autoCapitalize="none"
            />
          )}
        </FormField>
        <FormField label="Rede" required error={errors.network?.message}>
          {(field) => (
            <Controller
              control={control}
              name="network"
              render={({ field: select }) => (
                <OptionSelect
                  fieldProps={field}
                  value={select.value}
                  onValueChange={select.onChange}
                  onBlur={select.onBlur}
                  ref={select.ref}
                  placeholder="Selecione uma rede"
                  options={NETWORK_OPTIONS}
                />
              )}
            />
          )}
        </FormField>
        <FormField label="Nome do perfil" required error={errors.profileName?.message}>
          {(field) => <Input {...field} {...register('profileName')} />}
        </FormField>
        <FormField label="Endereço da carteira" required error={errors.address?.message}>
          {(field) => (
            <Input
              {...field}
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
          {(field) => (
            <Input
              {...field}
              {...register('alternateAddress')}
              spellCheck={false}
              autoCapitalize="none"
            />
          )}
        </FormField>
        <FormField label="Código de indicação" required error={errors.referralCode?.message}>
          {(field) => (
            <Input {...field} {...register('referralCode')} autoCapitalize="characters" />
          )}
        </FormField>
        <FormField label="E-mail" required error={errors.email?.message}>
          {(field) => <Input {...field} {...register('email')} type="email" autoComplete="email" />}
        </FormField>
        <FormField label="Nome ENS" required error={errors.ensLabel?.message}>
          {(field) => <EnsInput {...field} {...register('ensLabel')} />}
        </FormField>
        <FormField
          label="Observação do colecionador (opcional)"
          error={errors.note?.message}
          className="md:col-span-2 md:max-w-[18.5rem]"
        >
          {(field) => <Textarea {...field} {...register('note')} rows={5} />}
        </FormField>
      </div>
    </section>
  )
}
