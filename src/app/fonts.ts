const FAMILY = '"Roboto Mono Variable"'
// Past this, render with the fallback anyway: a slow font must never block the page
const MAX_WAIT_MS = 1_200

/**
 * Waits (briefly) for the only typeface so the first paint already uses it. Painting with
 * the fallback and swapping later re-wraps titles and shifts the layout (CLS), e.g. the
 * mobile hero title gaining a line. Runs in parallel with MSW start-up, which the first
 * render waits for anyway, so it rarely adds any delay.
 */
export async function loadFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  const fonts = Promise.all([
    document.fonts.load(`400 1em ${FAMILY}`),
    document.fonts.load(`700 1em ${FAMILY}`),
  ])
  const timeout = new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS))
  await Promise.race([fonts, timeout]).catch(() => {})
}
