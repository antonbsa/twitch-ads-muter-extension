import { recordMutedAd } from '../src/content/stats'
import type { AdMuteStats } from '../src/types'

declare const __test: {
  storageData: Record<string, unknown>
}

describe('stats', () => {
  beforeEach(() => {
    for (const key of Object.keys(__test.storageData)) {
      delete __test.storageData[key]
    }
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should create stats and increments counts', async () => {
    await recordMutedAd('Hayashii')

    const stats = __test.storageData.adMuteStats as AdMuteStats
    expect(stats.version).toBe(2)
    expect(stats.allTimeTotal).toBe(1)
    expect(stats.channels).toHaveLength(1)
    expect(stats.channels[0].channel).toBe('hayashii')
    expect(stats.channels[0].allTimeCount).toBe(1)
    expect(stats.channels[0].log).toHaveLength(1)
  })
})
