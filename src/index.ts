import { startAdObserver } from './content/ads'
import {
  loadAudioPreference,
  listenAudioPreferenceChanges,
} from './content/audio'
import { collectLiveData, startLiveDataObserver } from './content/live-data'
import { registerMessageHandlers } from './content/messages'
import { loadSettings } from './content/settings'

function tryLogAfterLoad(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return
  setTimeout(() => {
    collectLiveData()
    startAdObserver()
    startLiveDataObserver()
  }, 1500)
}

loadSettings()
loadAudioPreference()
listenAudioPreferenceChanges()
registerMessageHandlers()

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryLogAfterLoad, { once: true })
} else {
  tryLogAfterLoad()
}
