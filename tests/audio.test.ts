import { vi } from 'vitest'
import { playSound } from '../src/content/audio'
import { setupPreferences } from '../src/content/preferences'
import { AUDIO_NOTIFICATION_KEY } from '../src/types'

declare const __test: {
  storageData: Record<string, unknown>
  storageListeners: Array<
    (
      changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
      areaName: string,
    ) => void
  >
}

beforeEach(() => {
  for (const key of Object.keys(__test.storageData)) {
    delete __test.storageData[key]
  }
})

it('should load audio preference from storage', async () => {
  __test.storageData[AUDIO_NOTIFICATION_KEY] = false
  const playSpy = vi.spyOn(Audio.prototype, 'play')
  await setupPreferences()
  await expect(playSound('mute')).resolves.toBeUndefined()
  expect(playSpy).not.toHaveBeenCalled()
})

it('should listen for preference changes', async () => {
  await setupPreferences()
  const listener = __test.storageListeners[__test.storageListeners.length - 1]

  listener({ [AUDIO_NOTIFICATION_KEY]: { newValue: false } }, 'local')

  const playSpy = vi.spyOn(Audio.prototype, 'play')
  await expect(playSound('mute')).resolves.toBeUndefined()
  expect(playSpy).not.toHaveBeenCalled()
})
