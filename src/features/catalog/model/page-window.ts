const WINDOW = 4

/** Pages around the current one, e.g. page 6 of 9 → [5, 6, 7, 8]. */
export function pageWindow(page: number, totalPages: number, size = WINDOW): number[] {
  const start = Math.max(1, Math.min(page - 1, totalPages - size + 1))
  const end = Math.min(totalPages, start + size - 1)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}
