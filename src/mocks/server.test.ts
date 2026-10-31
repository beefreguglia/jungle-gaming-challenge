import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createMemoryStorage } from './db/storage'
import { createMockServer } from './server'

const API_URL = 'http://localhost/api'
const mock = createMockServer({ apiBase: API_URL, storage: createMemoryStorage() })
const server = setupServer(...mock.handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  mock.control.setScenario('instant')
  mock.control.reset()
})

const listStatus = async () => (await fetch(`${API_URL}/nfts`)).status

async function editionPrice(nftId: string, editionId: string): Promise<string> {
  const nft = (await (await fetch(`${API_URL}/nfts/${nftId}`)).json()) as {
    editions: { id: string; price: string }[]
  }
  return nft.editions.find((edition) => edition.id === editionId)?.price ?? ''
}

describe('mock control: reproducible scenarios', () => {
  it('replays the "fail twice, then recover" sequence after a reset or a scenario switch', async () => {
    mock.control.setScenario('flaky')
    expect([await listStatus(), await listStatus(), await listStatus()]).toEqual([503, 503, 200])

    mock.control.reset()
    expect([await listStatus(), await listStatus(), await listStatus()]).toEqual([503, 503, 200])

    mock.control.setScenario('instant')
    mock.control.setScenario('flaky')
    expect([await listStatus(), await listStatus()]).toEqual([503, 503])
  })

  it('restores the seeded data on reset', async () => {
    const target = { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50' }
    const seeded = await editionPrice(target.nftId, target.editionId)

    mock.control.updateEdition(target, { price: '9.99' })
    expect(await editionPrice(target.nftId, target.editionId)).toBe('9.99')

    mock.control.reset()
    expect(await editionPrice(target.nftId, target.editionId)).toBe(seeded)
  })
})
