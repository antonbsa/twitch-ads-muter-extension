import { vi } from 'vitest'
import { getSettings, loadSettings } from '../src/content/settings'
import * as logger from '../src/utils/logger'

beforeEach(() => {
  vi.spyOn(logger, 'setDebugEnabled').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should load defaults and local settings', async () => {
  if (!globalThis.fetch) {
    globalThis.fetch = vi.fn() as unknown as typeof fetch
  }
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ DEBUG_MODE: true }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ DEBUG_MODE: false }),
    } as Response)

  await loadSettings()

  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(getSettings().DEBUG_MODE).toBe(false)
})
