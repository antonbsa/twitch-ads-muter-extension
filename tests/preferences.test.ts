import {
  setupPreferences,
  isAudioEnabled,
  isMuteAdsEnabled,
} from '../src/content/preferences'
import { AD_MUTE_ENABLED_KEY, AUDIO_NOTIFICATION_KEY } from '../src/types'

declare const __test: {
  storageData: Record<string, unknown>
  storageListeners: Array<
    (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
      areaName: string,
    ) => void
  >
}

describe('preferences', () => {
  beforeEach(() => {
    for (const key of Object.keys(__test.storageData)) {
      delete __test.storageData[key]
    }
  })

  it('should default to true when storage has no values', async () => {
    await setupPreferences()

    expect(isAudioEnabled()).toBe(true)
    expect(isMuteAdsEnabled()).toBe(true)
  })

  it('should load initial values from storage', async () => {
    __test.storageData[AUDIO_NOTIFICATION_KEY] = false
    __test.storageData[AD_MUTE_ENABLED_KEY] = false

    await setupPreferences()

    expect(isAudioEnabled()).toBe(false)
    expect(isMuteAdsEnabled()).toBe(false)
  })

  it('should update values on storage change', async () => {
    await setupPreferences()
    const listener = __test.storageListeners[__test.storageListeners.length - 1]

    listener({ [AUDIO_NOTIFICATION_KEY]: { newValue: false } }, 'local')
    listener({ [AD_MUTE_ENABLED_KEY]: { newValue: false } }, 'local')

    expect(isAudioEnabled()).toBe(false)
    expect(isMuteAdsEnabled()).toBe(false)
  })
})
