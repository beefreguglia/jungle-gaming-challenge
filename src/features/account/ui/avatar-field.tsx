import { ImageIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { toast } from 'sonner'

import { AVATAR_MIME_TYPES, AVATAR_PROBLEM_MESSAGE, avatarProblem } from '@/domain/profile'
import { isApiError } from '@/shared/api'
import { Button } from '@/shared/ui/button'

import { useRemoveAvatar, useUploadAvatar } from '../api/account-queries'

/**
 * Figma "Avatar": round preview, "Alterar" (file picker) and "Remover". The file is checked
 * here (type, 2 MB) and again by the API; errors are announced next to the control.
 */
export function AvatarField({ avatarUrl }: { avatarUrl: string | null }) {
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const labelId = useId()
  const errorId = useId()
  const busy = upload.isPending || remove.isPending

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const problem = avatarProblem(file)
    if (problem) {
      setError(AVATAR_PROBLEM_MESSAGE[problem])
      return
    }
    setError(null)
    upload.mutate(file, {
      onSuccess: () => toast.success('Avatar atualizado'),
      onError: (failure) =>
        setError(
          isApiError(failure) && failure.fields?.avatar
            ? failure.fields.avatar
            : 'Não foi possível enviar a imagem.',
        ),
    })
  }

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      className="flex flex-col gap-2"
    >
      <p id={labelId} className="text-body font-medium">
        Avatar
      </p>
      <div className="flex items-center gap-6">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-accent-foreground">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Seu avatar atual" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-6" aria-label="Sem avatar" />
          )}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_MIME_TYPES.join(',')}
          onChange={pick}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <Button disabled={busy} onClick={() => inputRef.current?.click()} className="w-24">
          {upload.isPending ? 'Enviando…' : 'Alterar'}
          <span className="sr-only"> avatar</span>
        </Button>
        {avatarUrl && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => remove.mutate()}
            className="font-normal"
          >
            Remover
            <span className="sr-only"> avatar</span>
          </Button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-caption text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
