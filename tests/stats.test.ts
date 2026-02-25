import { vi } from 'vitest'
import { recordMutedAd } from '../src/content/stats'
import type { AdMuteStats } from '../src/types'

declare const __test: {
  storageData: Record<string, unknown>
}

beforeEach(() => {
  for (const key of Object.keys(__test.storageData)) {
    delete __test.storageData[key]
  }
  vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should create stats and increments counts', async () => {
  await recordMutedAd('Hayashii')

  const stats = __test.storageData.adMuteStats as AdMuteStats
  expect(stats.version).toBe(2)
  expect(stats.allTimeTotal).toBe(1)
  expect(stats.allTimeMutedMs).toBe(0)
  expect(stats.channels).toHaveLength(1)
  expect(stats.channels[0].channel).toBe('hayashii')
  expect(stats.channels[0].allTimeCount).toBe(1)
  expect(stats.channels[0].allTimeMutedMs).toBe(0)
  expect(stats.channels[0].log).toHaveLength(1)
})

it('should accumulate muted duration when provided', async () => {
  await recordMutedAd('Hayashii', 2_500)
  await recordMutedAd('Hayashii', 1_500)

  const stats = __test.storageData.adMuteStats as AdMuteStats
  expect(stats.allTimeTotal).toBe(2)
  expect(stats.allTimeMutedMs).toBe(4_000)
  expect(stats.channels[0].allTimeCount).toBe(2)
  expect(stats.channels[0].allTimeMutedMs).toBe(4_000)
})
