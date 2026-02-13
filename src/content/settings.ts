import type { Settings } from '../types'
import { setDebugEnabled } from '../utils/logger'

let settings: Settings = {}

export function getSettings(): Settings {
  return settings
}

export async function loadSettings(): Promise<void> {
  try {
    const defaultsUrl = chrome.runtime.getURL('settings.defaults.json')
    const defaultsResponse = await fetch(defaultsUrl)
    if (defaultsResponse.ok) {
      const defaults = await defaultsResponse.json()
      if (defaults && typeof defaults === 'object') {
        settings = { ...settings, ...(defaults as Settings) }
      }
    }

    const localUrl = chrome.runtime.getURL('settings.json')
    const localResponse = await fetch(localUrl)
    if (localResponse.ok) {
      const local = await localResponse.json()
      if (local && typeof local === 'object') {
        settings = { ...settings, ...(local as Settings) }
      }
    }
  } catch {
    // Local settings are optional and ignored if missing.
  } finally {
    setDebugEnabled(Boolean(settings.DEBUG_MODE))
  }
}
