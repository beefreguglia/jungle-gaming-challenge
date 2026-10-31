import type * as React from 'react'

import type { FieldControlProps } from './form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

interface OptionSelectProps {
  // FormField wiring (id, aria-invalid, aria-describedby) goes on the trigger
  fieldProps: FieldControlProps
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  placeholder: string
  options: readonly { value: string; label: string }[]
  ref?: React.Ref<HTMLButtonElement>
}

/** Radix Select for a fixed list; an empty value shows the placeholder (Figma "Selecione…"). */
export function OptionSelect({
  fieldProps,
  value,
  onValueChange,
  onBlur,
  placeholder,
  options,
  ref,
}: OptionSelectProps) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger {...fieldProps} ref={ref} onBlur={onBlur} className="w-full">
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
  )
}
