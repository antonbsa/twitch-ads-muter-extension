import { startAdObserver } from './content/ads'
import { collectLiveData, startLiveDataObserver } from './content/live-data'
import { registerMessageHandlers } from './content/messages'
import { setupPreferences } from './content/preferences'
import { loadSettings } from './content/settings'

function startTwitchObservers(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return

  collectLiveData()
  startAdObserver()
  startLiveDataObserver()
}

function onDomReady(callback: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true })
  } else {
    callback()
  }
}

function initContentScript(): void {
  loadSettings()
  setupPreferences()
  registerMessageHandlers()

  onDomReady(() => {
    setTimeout(startTwitchObservers, 1500)
  })
}

initContentScript()
