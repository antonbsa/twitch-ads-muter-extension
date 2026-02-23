import { getSettings, loadSettings } from '../src/content/settings'
import * as logger from '../src/utils/logger'

describe('settings', () => {
  beforeEach(() => {
    jest.spyOn(logger, 'setDebugEnabled').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads defaults and local settings', async () => {
    if (!globalThis.fetch) {
      globalThis.fetch = jest.fn() as unknown as typeof fetch
    }
    const fetchMock = jest
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
})
