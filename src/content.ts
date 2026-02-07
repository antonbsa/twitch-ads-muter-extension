import type {
  Settings,
  LiveData,
  GetDataMessage,
  GetDataResponse,
} from './types'

let settings: Settings = {}

async function loadSettings(): Promise<void> {
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
  }
}

loadSettings()

const SELECTORS = {
  // These selectors are best-effort guesses and may need updates.
  viewers: 'strong[data-a-target="animated-channel-viewers-count"]',
  liveTime: 'span.live-time span',
  adIndicator: '[aria-label="Ad"]',
  muteButton: 'button[data-a-target="player-mute-unmute-button"]',
  sliderVolume: 'input[id^="player-volume-slider"]',
}

let adActive = false
let mutedByExtension = false
let lastLiveData: LiveData | null = null

function getChannelFromUrl(): string | null {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '')
  if (!path) return null
  const [channel] = path.split('/')
  return channel || null
}

function parseViewerCount(text: string | null): number | null {
  if (!text) return null
  const trimmed = text.replace(/\s+/g, '')
  const match = trimmed.match(/^([0-9,.]+)([KkMm])?$/)
  if (!match) return null
  const value = Number(match[1].replace(/,/g, ''))
  if (Number.isNaN(value)) return null
  const unit = match[2]?.toLowerCase()
  if (unit === 'k') return Math.round(value * 1000)
  if (unit === 'm') return Math.round(value * 1000000)
  return Math.round(value)
}

function extractLiveData(): LiveData {
  const channel = getChannelFromUrl()
  const viewersEl = document.querySelector<HTMLElement>(SELECTORS.viewers)
  const liveTimeEl = document.querySelector<HTMLElement>(SELECTORS.liveTime)

  const viewersText = viewersEl?.textContent?.trim() || null
  const liveTimeText = liveTimeEl?.textContent?.trim() || null

  return {
    channel,
    viewersText,
    viewers: parseViewerCount(viewersText),
    liveTime: liveTimeText,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }
}

function updateLiveDataCache(): LiveData {
  const data = extractLiveData()
  lastLiveData = data
  return data
}

function hasAnyLiveField(data: LiveData | null): boolean {
  if (!data) return false
  return Boolean(data.viewersText || data.liveTime)
}

function collectLiveData(): LiveData {
  const data = updateLiveDataCache()
  if (settings.DEBUG_MODE) console.log('[Twitch ads muter]', data)

  return data
}

function getMuteButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(SELECTORS.muteButton)
}

function getVolumeSliderValue(): number | null {
  const slider = document.querySelector<HTMLElement>(SELECTORS.sliderVolume)
  if (!slider) return null

  const raw =
    slider.getAttribute('value') ??
    slider.getAttribute('aria-valuenow') ??
    slider.getAttribute('data-value')
  if (raw == null) return null

  const value = Number(raw)
  if (Number.isNaN(value)) return null
  return value
}

function getIsMuted(): boolean | null {
  const sliderValue = getVolumeSliderValue()
  if (sliderValue == null) return null
  return sliderValue === 0
}

function ensureMuted(): void {
  const button = getMuteButton()
  if (!button) return
  const isMuted = getIsMuted()
  if (isMuted === true) return

  button.click()
  mutedByExtension = true
}

function ensureUnmuted(): void {
  if (!mutedByExtension) return
  const button = getMuteButton()
  if (!button) return
  const isMuted = getIsMuted()
  if (isMuted === false) {
    mutedByExtension = false
    return
  }

  button.click()
  mutedByExtension = false
}

function isAdIndicatorVisible(): boolean {
  return Boolean(document.querySelector(SELECTORS.adIndicator))
}

function handleAdState(): void {
  const active = isAdIndicatorVisible()

  if (active !== adActive) {
    adActive = active
    if (adActive) {
      ensureMuted()
    } else {
      ensureUnmuted()
    }
    return
  }

  if (adActive) {
    ensureMuted()
  }
}

function startAdObserver(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return

  const observer = new MutationObserver(() => {
    handleAdState()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  })

  handleAdState()
}

function waitForElements(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve) => {
    const hasAnyElement = () =>
      Boolean(
        document.querySelector(SELECTORS.viewers) ||
        document.querySelector(SELECTORS.liveTime),
      )

    if (hasAnyElement()) {
      resolve()
      return
    }

    const observer = new MutationObserver(() => {
      if (hasAnyElement()) {
        observer.disconnect()
        resolve()
      }
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    })

    setTimeout(() => {
      observer.disconnect()
      resolve()
    }, timeoutMs)
  })
}

function startLiveDataObserver(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return

  const observer = new MutationObserver(() => {
    updateLiveDataCache()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  updateLiveDataCache()
}

function tryLogAfterLoad(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return
  setTimeout(() => {
    collectLiveData()
    startAdObserver()
    startLiveDataObserver()
  }, 1500)
}

chrome.runtime.onMessage.addListener(
  (
    message: GetDataMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: GetDataResponse) => void,
  ) => {
    if (message?.type === 'getData') {
      const wait = Boolean(message.wait)

      if (wait) {
        if (hasAnyLiveField(lastLiveData)) {
          sendResponse({ ok: true, data: collectLiveData() })
          return
        }

        waitForElements().then(() => {
          const data = collectLiveData()
          sendResponse({ ok: true, data })
        })
        return true
      }

      const data = collectLiveData()
      sendResponse({ ok: true, data })
    }
  },
)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryLogAfterLoad, { once: true })
} else {
  tryLogAfterLoad()
}
