import { expect, type Page } from '@playwright/test'

/** Subset of `window.__kurioMock` (src/mocks/server.ts) the specs drive. */
interface MockControl {
  disconnectRealtime(): void
  expireSessions(): void
  realtimeUsers(): (string | null)[]
  setScenario(name: string): void
  updateEdition(
    target: { nftId: string; editionId: string },
    patch: { price?: string; available?: number },
  ): void
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
    // Drops every Socket.IO connection; the client reconnects on its own and reconciles
    disconnectRealtime: () =>
      page.evaluate(() => (globalThis as MockWindow).__kurioMock?.disconnectRealtime()),
    expireSessions: () =>
      page.evaluate(() => (globalThis as MockWindow).__kurioMock?.expireSessions()),
    realtimeUsers: () =>
      page.evaluate(() => (globalThis as MockWindow).__kurioMock?.realtimeUsers() ?? []),
    setScenario: (name: string) =>
      page.evaluate(
        (scenario) => (globalThis as MockWindow).__kurioMock?.setScenario(scenario),
        name,
      ),
    // Changes price/stock in the mock database, which emits `nft.updated` over Socket.IO
    updateEdition: (
      target: { nftId: string; editionId: string },
      patch: { price?: string; available?: number },
    ) =>
      page.evaluate(([t, p]) => (globalThis as MockWindow).__kurioMock?.updateEdition(t, p), [
        target,
        patch,
      ] as const),
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

type CartSeed = [nftId: string, editionId: string, quantity: number][]

/**
 * Builds a visitor cart through the mock API and stores its id like the app does, so the
 * next page load finds it. Setup only: adding from the UI is covered by the detail specs.
 */
export async function seedVisitorCart(page: Page, items: CartSeed): Promise<void> {
  await page.evaluate(async (lines) => {
    let cartId: string | null = null
    for (const [nftId, editionId, quantity] of lines) {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cartId ? { 'X-Cart-Id': cartId } : {}) },
        body: JSON.stringify({ nftId, editionId, quantity }),
      })
      cartId = ((await response.json()) as { id: string }).id
    }
    if (cartId) localStorage.setItem('kurio:cart-id', cartId)
  }, items)
}
