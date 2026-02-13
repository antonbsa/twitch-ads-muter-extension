import { AUDIO_NOTIFICATION_KEY } from '../types'
import { logger } from '../utils/logger'

const AUDIO_VOLUME = 0.3

const AUDIO_FILES = {
  mute: 'dist/audios/ad-start.mp3',
  unmute: 'dist/audios/ad-end.mp3',
}

type AudioFilesKey = keyof typeof AUDIO_FILES

let audioNotificationsEnabled = true

export async function playSound(path: AudioFilesKey): Promise<void> {
  if (!audioNotificationsEnabled) return

  try {
    const url = chrome.runtime.getURL(AUDIO_FILES[path])
    const audio = new Audio(url)
    audio.volume = AUDIO_VOLUME
    await audio.play()
  } catch (error) {
    // Silently ignore "Extension context invalidated" errors (happens when extension is reloaded)
    const isContextInvalidated =
      error instanceof Error &&
      error.message.includes('Extension context invalidated')
    if (!isContextInvalidated) {
      logger.warn('Failed to play sound', error)
    }
  }
}

export async function loadAudioPreference(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(AUDIO_NOTIFICATION_KEY)
    const value = stored[AUDIO_NOTIFICATION_KEY]
    if (typeof value === 'boolean') {
      audioNotificationsEnabled = value
    }
  } catch {
    // Ignore storage errors; keep default on.
  }
}

export function listenAudioPreferenceChanges(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return
    const change = changes[AUDIO_NOTIFICATION_KEY]
    if (!change) return
    const next = change.newValue
    if (typeof next === 'boolean') {
      audioNotificationsEnabled = next
    }
  })
}
