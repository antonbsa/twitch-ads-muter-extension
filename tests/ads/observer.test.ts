import { vi } from 'vitest'
import { startAdObserver } from '../../src/content/ads/observer'
import { isAnyAdIndicatorPresent } from '../../src/content/selectors'
import { ensureMuted, ensureUnmuted } from '../../src/content/mute'
import { recordMutedAd } from '../../src/content/ads/stats'
import { getChannelFromUrl } from '../../src/content/live-data'
import { isMuteAdsEnabled } from '../../src/content/preferences'

vi.mock('../../src/content/selectors', () => ({
  isAnyAdIndicatorPresent: vi.fn(),
}))

vi.mock('../../src/content/mute', () => ({
  ensureMuted: vi.fn(),
  ensureUnmuted: vi.fn(),
}))

vi.mock('../../src/content/ads/stats', () => ({
  recordMutedAd: vi.fn(),
}))

vi.mock('../../src/content/live-data', () => ({
  getChannelFromUrl: vi.fn(),
}))

vi.mock('../../src/content/preferences', () => ({
  isMuteAdsEnabled: vi.fn(),
}))

const THROTTLE_MS = 300

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

async function flushMicrotasks(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0)
}

async function flushThrottle(): Promise<void> {
  await vi.advanceTimersByTimeAsync(THROTTLE_MS)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  observerCallback = null
  vi.stubGlobal('location', { hostname: 'www.twitch.tv' } as Location)
  ;(
    globalThis as unknown as { MutationObserver: typeof MutationObserver }
  ).MutationObserver = MockMutationObserver
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should record muted ad only after unmute happens', async () => {
  const adIndicatorMock = vi.mocked(isAnyAdIndicatorPresent)
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

  // 1st call: initial check performed by startAdObserver (no ad yet).
  // 2nd/3rd calls: throttled checks triggered by mutation events below.
  adIndicatorMock
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true)
    .mockReturnValueOnce(false)

  startAdObserver()
  expect(observerCallback).not.toBeNull()
  await flushMicrotasks()

  observerCallback?.([], observerCallback as unknown as MutationObserver)
  await flushThrottle()

  expect(ensureMutedMock).toHaveBeenCalledTimes(1)
  expect(recordMutedAdMock).not.toHaveBeenCalled()

  observerCallback?.([], observerCallback as unknown as MutationObserver)
  await flushThrottle()

  expect(ensureUnmutedMock).toHaveBeenCalledTimes(1)
  expect(recordMutedAdMock).toHaveBeenCalledTimes(1)
  expect(recordMutedAdMock).toHaveBeenCalledWith('hayashii', 3_000)
})

it('should coalesce bursts of mutations into a single check', async () => {
  const adIndicatorMock = vi.mocked(isAnyAdIndicatorPresent)
  const isMuteAdsEnabledMock = vi.mocked(isMuteAdsEnabled)

  isMuteAdsEnabledMock.mockReturnValue(true)
  adIndicatorMock.mockReturnValue(false)

  startAdObserver()
  await flushMicrotasks()
  adIndicatorMock.mockClear()

  for (let i = 0; i < 20; i++) {
    observerCallback?.([], observerCallback as unknown as MutationObserver)
  }
  await flushThrottle()

  expect(adIndicatorMock).toHaveBeenCalledTimes(1)
})
