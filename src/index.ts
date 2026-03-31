import { startAdObserver } from './content/ads'
import { registerMessageHandlers } from './content/messages'
import { setupPreferences } from './content/preferences'
import { loadSettings } from './content/settings'

function startTwitchObservers(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return

  startAdObserver()
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
    startTwitchObservers()
  })
}

initContentScript()
