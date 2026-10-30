import { z } from 'zod'

import {
  emailSchema,
  ensLabelSchema,
  passwordSchema,
  requiredText,
  usernameSchema,
} from './validation'

export const profileSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensLabel: z.string().nullable(),
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
  updatedAt: z.iso.datetime(),
})

export type Profile = z.infer<typeof profileSchema>

// Fields of the "Perfil do colecionador" frame
export const profileInputSchema = z.object({
  displayName: requiredText(),
  username: usernameSchema,
  email: emailSchema,
  ensLabel: ensLabelSchema,
  walletNickname: requiredText(40),
})

export type ProfileInput = z.infer<typeof profileInputSchema>

export const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((form) => form.newPassword === form.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
  .refine((form) => form.newPassword !== form.currentPassword, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  })

export type PasswordForm = z.infer<typeof passwordFormSchema>

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
})

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>

// --- Avatar (multipart upload to PUT /profile/avatar) ---------------------------------------

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export type AvatarProblem = 'type' | 'size'

/** Validates the file before upload; the API applies the same rule. */
export function avatarProblem(file: { type: string; size: number }): AvatarProblem | null {
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) return 'type'
  if (file.size > AVATAR_MAX_BYTES) return 'size'
  return null
}

export const AVATAR_PROBLEM_MESSAGE: Record<AvatarProblem, string> = {
  type: 'Use uma imagem PNG, JPEG ou WebP',
  size: 'A imagem deve ter no máximo 2 MB',
}
