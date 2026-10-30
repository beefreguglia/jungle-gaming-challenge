import { z } from 'zod'

export const DEFAULT_PAGE_SIZE = 12

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function totalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize)
}
