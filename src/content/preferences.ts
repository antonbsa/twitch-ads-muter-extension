import { AD_MUTE_ENABLED_KEY, AUDIO_NOTIFICATION_KEY } from '../types'

let muteAdsEnabled = true
let audioNotificationsEnabled = true

export function isMuteAdsEnabled(): boolean {
  return muteAdsEnabled
}

export function isAudioEnabled(): boolean {
  return audioNotificationsEnabled
}

export async function setupPreferences(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([
      AUDIO_NOTIFICATION_KEY,
      AD_MUTE_ENABLED_KEY,
    ])

    const audioValue = stored[AUDIO_NOTIFICATION_KEY]
    if (typeof audioValue === 'boolean') {
      audioNotificationsEnabled = audioValue
    }

    const muteValue = stored[AD_MUTE_ENABLED_KEY]
    if (typeof muteValue === 'boolean') {
      muteAdsEnabled = muteValue
    }
  } catch {
    // Ignore storage errors; keep defaults on.
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return

    const muteChange = changes[AD_MUTE_ENABLED_KEY]
    if (muteChange && typeof muteChange.newValue === 'boolean') {
      muteAdsEnabled = muteChange.newValue
    }

    const audioChange = changes[AUDIO_NOTIFICATION_KEY]
    if (audioChange && typeof audioChange.newValue === 'boolean') {
      audioNotificationsEnabled = audioChange.newValue
    }
  })
}
