import { startAdObserver } from './content/ads'
import { registerMessageHandlers } from './content/messages'
import { setupPreferences } from './content/preferences'
import { loadSettings } from './content/settings'
import { logger } from './utils/logger'

function startTwitchObservers(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return

  logger.log('Starting Twitch observers', {
    hostname: window.location.hostname,
    href: window.location.href,
  })
  startAdObserver()
}

function onDomReady(callback: () => void): void {
  if (document.readyState === 'loading') {
    logger.log('Document still loading, waiting for DOMContentLoaded')
    document.addEventListener('DOMContentLoaded', callback, { once: true })
  } else {
    logger.log('Document already ready', { readyState: document.readyState })
    callback()
  }
}

function initContentScript(): void {
  logger.log('Initializing content script', {
    href: window.location.href,
    readyState: document.readyState,
  })
  loadSettings()
  setupPreferences()
  registerMessageHandlers()

  onDomReady(() => {
    logger.log('DOM ready callback fired')
    startTwitchObservers()
  })
}

initContentScript()
