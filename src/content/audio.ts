import { logger } from '../utils/logger'
import { isAudioEnabled } from './preferences'

const AUDIO_VOLUME = 0.3

const AUDIO_FILES = {
  mute: 'dist/audios/ad-start.mp3',
  unmute: 'dist/audios/ad-end.mp3',
}

type AudioFilesKey = keyof typeof AUDIO_FILES

export async function playSound(path: AudioFilesKey): Promise<void> {
  if (!isAudioEnabled()) return

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
