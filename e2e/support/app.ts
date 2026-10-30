import { expect, type Page } from '@playwright/test'

/** Subset of `window.__kurioMock` (src/mocks/server.ts) the specs drive. */
interface MockControl {
  expireSessions(): void
  realtimeUsers(): (string | null)[]
}

type MockWindow = { __kurioMock?: MockControl }

// Demo accounts from src/mocks/fixtures/users.ts
export const PASSWORD = 'kurio1234'
export const USERS = {
  nova: { id: 'user-nova', email: 'nova@kurio.art', name: 'Nova Sato' },
  kai: { id: 'user-kai', email: 'kai@kurio.art', name: 'Kai Moreno' },
} as const

/**
 * Opens a page with a mock scenario and waits until MSW intercepts requests. Every test
 * runs in a fresh browser context, so the mock database starts from the seed.
 */
export async function openApp(page: Page, path = '/', scenario = 'instant'): Promise<void> {
  const url = new URL(path, 'http://app.local')
  url.searchParams.set('scenario', scenario)
  await page.goto(`${url.pathname}${url.search}`)
  await page.waitForFunction(() => (globalThis as MockWindow).__kurioMock !== undefined)
}

export function mock(page: Page) {
  return {
    expireSessions: () =>
      page.evaluate(() => (globalThis as MockWindow).__kurioMock?.expireSessions()),
    realtimeUsers: () =>
      page.evaluate(() => (globalThis as MockWindow).__kurioMock?.realtimeUsers() ?? []),
  }
}

/** Fills the sign-in form on screen (page or dialog) and submits it. */
export async function submitSignIn(page: Page, email: string, password = PASSWORD) {
  const form = page.getByRole('form', { name: 'Entrar' })
  await form.getByLabel('E-mail').fill(email)
  await form.getByLabel('Senha', { exact: true }).fill(password)
  await form.getByRole('button', { name: 'Entrar' }).click()
}

/** Signs in through /login, landing on `path` (a private page). */
export async function signInAt(page: Page, path: string, email: string) {
  await openApp(page, path)
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await submitSignIn(page, email)
  await expect(page).toHaveURL(path)
}
