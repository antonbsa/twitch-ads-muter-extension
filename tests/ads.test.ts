import { vi } from 'vitest'
import { startAdObserver } from '../src/content/ads'
import { isAdIndicatorVisible } from '../src/content/selectors'
import { ensureMuted, ensureUnmuted } from '../src/content/mute'
import { recordMutedAd } from '../src/content/stats'
import { getChannelFromUrl } from '../src/content/live-data'
import { isMuteAdsEnabled } from '../src/content/preferences'

vi.mock('../src/content/selectors', () => ({
  isAdIndicatorVisible: vi.fn(),
}))

vi.mock('../src/content/mute', () => ({
  ensureMuted: vi.fn(),
  ensureUnmuted: vi.fn(),
}))

vi.mock('../src/content/stats', () => ({
  recordMutedAd: vi.fn(),
}))

vi.mock('../src/content/live-data', () => ({
  getChannelFromUrl: vi.fn(),
}))

vi.mock('../src/content/preferences', () => ({
  isMuteAdsEnabled: vi.fn(),
}))

let observerCallback: MutationCallback | null = null

class MockMutationObserver {
  private callback: MutationCallback

  constructor(callback: MutationCallback) {
    this.callback = callback
    observerCallback = callback
  }

  observe() {}

  disconnect() {}

  takeRecords(): MutationRecord[] {
    return []
  }
}

async function flushAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  vi.clearAllMocks()
  observerCallback = null
  vi.stubGlobal('location', { hostname: 'www.twitch.tv' } as Location)
  ;(
    globalThis as unknown as { MutationObserver: typeof MutationObserver }
  ).MutationObserver = MockMutationObserver
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should record muted ad only after unmute happens', async () => {
  const adIndicatorMock = vi.mocked(isAdIndicatorVisible)
  const ensureMutedMock = vi.mocked(ensureMuted)
  const ensureUnmutedMock = vi.mocked(ensureUnmuted)
  const recordMutedAdMock = vi.mocked(recordMutedAd)
  const getChannelFromUrlMock = vi.mocked(getChannelFromUrl)
  const isMuteAdsEnabledMock = vi.mocked(isMuteAdsEnabled)

  isMuteAdsEnabledMock.mockReturnValue(true)
  getChannelFromUrlMock.mockReturnValue('hayashii')
  ensureMutedMock.mockResolvedValue(true)
  ensureUnmutedMock.mockResolvedValue(true)

  vi.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(4_000)

  adIndicatorMock
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true)
    .mockReturnValueOnce(false)

  startAdObserver()
  expect(observerCallback).not.toBeNull()

  observerCallback?.([], observerCallback as unknown as MutationObserver)
  await flushAsync()

  expect(ensureMutedMock).toHaveBeenCalledTimes(1)
  expect(recordMutedAdMock).not.toHaveBeenCalled()

  observerCallback?.([], observerCallback as unknown as MutationObserver)
  await flushAsync()

  expect(ensureUnmutedMock).toHaveBeenCalledTimes(1)
  expect(recordMutedAdMock).toHaveBeenCalledTimes(1)
  expect(recordMutedAdMock).toHaveBeenCalledWith('hayashii', 3_000)
})
