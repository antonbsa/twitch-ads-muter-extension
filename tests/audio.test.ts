import {
  loadAudioPreference,
  listenAudioPreferenceChanges,
  playSound,
} from '../src/content/audio'

declare const __test: {
  storageData: Record<string, unknown>
  storageListeners: Array<
    (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
      areaName: string,
    ) => void
  >
}

describe('audio', () => {
  beforeEach(() => {
    for (const key of Object.keys(__test.storageData)) {
      delete __test.storageData[key]
    }
  })

  it('loads audio preference from storage', async () => {
    __test.storageData.audioNotificationsEnabled = false
    const playSpy = jest.spyOn(Audio.prototype, 'play')
    await loadAudioPreference()
    await expect(playSound('mute')).resolves.toBeUndefined()
    expect(playSpy).not.toHaveBeenCalled()
  })

  it('listens for preference changes', async () => {
    listenAudioPreferenceChanges()
    const listener = __test.storageListeners[__test.storageListeners.length - 1]

    listener({ audioNotificationsEnabled: { newValue: false } }, 'local')

    const playSpy = jest.spyOn(Audio.prototype, 'play')
    await expect(playSound('mute')).resolves.toBeUndefined()
    expect(playSpy).not.toHaveBeenCalled()
  })
})
