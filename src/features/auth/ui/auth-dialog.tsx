import { useState } from 'react'
import type * as React from 'react'

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'

import type { AuthMode } from '../model/auth-route'
import { AuthPanel } from './auth-panel'

/**
 * Desktop sign-in/sign-up dialog from the Figma, opened from the header over the current
 * page. Signing in keeps the user where they are; focus returns to the trigger on close.
 */
export function AuthDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('sign-in')

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) setMode('sign-in')
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="block max-h-[calc(100dvh-2rem)] overflow-y-auto border-b-[6px] border-primary px-8 pt-12 pb-14 sm:max-w-[31.25rem] [&>[data-slot=dialog-close]]:text-accent-foreground"
      >
        <DialogTitle className="sr-only">Acesse sua conta</DialogTitle>
        <AuthPanel
          variant="dialog"
          mode={mode}
          onModeChange={setMode}
          onSuccess={() => changeOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
