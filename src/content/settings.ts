import type { Settings } from '../types'
import { logger, setDebugEnabled } from '../utils/logger'

let settings: Settings = {}

export function getSettings(): Settings {
  return settings
}

export async function loadSettings(): Promise<void> {
  try {
    const defaultsUrl = chrome.runtime.getURL('settings.defaults.json')
    logger.log('Loading default settings', { url: defaultsUrl })
    const defaultsResponse = await fetch(defaultsUrl)
    logger.log('Default settings response received', {
      ok: defaultsResponse.ok,
      url: defaultsUrl,
    })
    if (defaultsResponse.ok) {
      const defaults = await defaultsResponse.json()
      if (defaults && typeof defaults === 'object') {
        settings = { ...settings, ...(defaults as Settings) }
        logger.log('Applied default settings', defaults)
      }
    }

    const localUrl = chrome.runtime.getURL('settings.json')
    logger.log('Loading local settings override', { url: localUrl })
    const localResponse = await fetch(localUrl)
    logger.log('Local settings response received', {
      ok: localResponse.ok,
      url: localUrl,
    })
    if (localResponse.ok) {
      const local = await localResponse.json()
      if (local && typeof local === 'object') {
        settings = { ...settings, ...(local as Settings) }
        logger.log('Applied local settings override', local)
      }
    }
  } catch (error) {
    // Local settings are optional and ignored if missing.
    logger.warn('Failed while loading settings', error)
  } finally {
    setDebugEnabled(Boolean(settings.DEBUG_MODE))
    logger.log('Settings ready', {
      debugMode: Boolean(settings.DEBUG_MODE),
      settings,
    })
  }
}
