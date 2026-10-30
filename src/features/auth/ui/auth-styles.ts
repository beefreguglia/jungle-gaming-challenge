/**
 * The same forms render in the desktop dialog and on the auth pages. Pages follow the
 * mobile frames below md (tall rounded fields, 60 px CTA) and the dialog sizes from md up.
 */
export type AuthVariant = 'dialog' | 'page'

export const authFieldClass: Record<AuthVariant, string> = {
  dialog: 'h-10',
  page: 'h-12 rounded-lg text-body-lg md:h-10 md:rounded-sm md:text-body',
}

export const authSubmitClass: Record<AuthVariant, string> = {
  dialog: 'mt-2 h-11 w-full',
  page: 'mt-6 h-15 w-full rounded-2xl text-body-lg md:mt-2 md:h-11 md:rounded-sm md:text-body',
}
