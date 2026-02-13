import type {
  Settings,
  LiveData,
  GetDataMessage,
  GetDataResponse,
  AdMuteStats,
} from './types'
import { AUDIO_NOTIFICATION_KEY, AD_MUTE_STATS_KEY } from './types'

let settings: Settings = {}

let adActive = false
let lastLiveData: LiveData | null = null
let audioNotificationsEnabled = true

const AUDIO_VOLUME = 0.3

const SELECTORS = {
  // These selectors are best-effort guesses and may need updates.
  viewers: 'strong[data-a-target="animated-channel-viewers-count"]',
  liveTime: 'span.live-time span',
  adIndicator: '[aria-label="Ad"]',
  muteButton: 'button[data-a-target="player-mute-unmute-button"]',
  sliderVolume: 'input[id^="player-volume-slider"]',
}

const AUDIO_FILES = {
  mute: 'dist/audios/ad-start.mp3',
  unmute: 'dist/audios/ad-end.mp3',
}

type AudioFilesKey = keyof typeof AUDIO_FILES

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

async function playSound(path: AudioFilesKey): Promise<void> {
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
    if (!isContextInvalidated && settings.DEBUG_MODE) {
      console.warn('[Twitch ads muter] Failed to play sound', error)
    }
  }
}

async function loadAudioPreference(): Promise<void> {
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

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return
  const change = changes[AUDIO_NOTIFICATION_KEY]
  if (!change) return
  const next = change.newValue
  if (typeof next === 'boolean') {
    audioNotificationsEnabled = next
  }
})

async function ensureMuted(): Promise<boolean> {
  const button = getMuteButton()
  if (!button) return false
  const isMuted = getIsMuted()
  if (isMuted === true) return false

  playSound('mute')
  button.click()
  return true
}

async function ensureUnmuted(): Promise<void> {
  const button = getMuteButton()
  if (!button) return
  const isMuted = getIsMuted()
  if (isMuted === false) return

  playSound('unmute')
  button.click()
}

function isAdIndicatorVisible(): boolean {
  return Boolean(document.querySelector(SELECTORS.adIndicator))
}

async function handleAdState(): Promise<void> {
  const active = isAdIndicatorVisible()

  if (active !== adActive) {
    adActive = active
    if (adActive) {
      const didMute = await ensureMuted()
      if (didMute) {
        recordMutedAd(getChannelFromUrl())
      }
    } else {
      await ensureUnmuted()
    }
  }
}

async function recordMutedAd(channel: string | null): Promise<void> {
  const key = (channel ?? 'unknown').toLowerCase()
  const timestamp = Date.now()
  const pruneBefore = timestamp - 30 * 24 * 60 * 60 * 1000

  try {
    const stored = await chrome.storage.local.get(AD_MUTE_STATS_KEY)
    const stats = normalizeMuteStats(stored[AD_MUTE_STATS_KEY])
    const channelStats =
      stats.channels.find((item) => item.channel === key) ??
      createChannelStats(key)

    channelStats.allTimeCount += 1
    channelStats.lastMutedAt = timestamp
    channelStats.log.push(timestamp)

    if (!stats.channels.includes(channelStats)) {
      stats.channels.push(channelStats)
    }

    stats.allTimeTotal += 1
    stats.lastPrunedAt = maybePruneStats(stats, pruneBefore, timestamp)

    await chrome.storage.local.set({ [AD_MUTE_STATS_KEY]: stats })
  } catch {
    // Ignore storage errors.
  }
}

function createEmptyStats(): AdMuteStats {
  return {
    version: 2,
    allTimeTotal: 0,
    channels: [],
  }
}

function createChannelStats(channel: string): AdMuteStats['channels'][number] {
  return {
    channel,
    allTimeCount: 0,
    log: [],
  }
}

function normalizeMuteStats(value: unknown): AdMuteStats {
  if (!value || typeof value !== 'object') {
    return createEmptyStats()
  }

  const candidate = value as Partial<AdMuteStats>
  if (candidate.version === 2 && Array.isArray(candidate.channels)) {
    return {
      version: 2,
      allTimeTotal: Number(candidate.allTimeTotal ?? 0),
      channels: candidate.channels
        .filter((item) => item && typeof item.channel === 'string')
        .map((item) => ({
          channel: item.channel.toLowerCase(),
          allTimeCount: Number(item.allTimeCount ?? 0),
          log: Array.isArray(item.log)
            ? item.log.filter((ts) => Number.isFinite(ts))
            : [],
          lastMutedAt: Number.isFinite(item.lastMutedAt)
            ? Number(item.lastMutedAt)
            : undefined,
        })),
      lastPrunedAt: Number.isFinite(candidate.lastPrunedAt)
        ? Number(candidate.lastPrunedAt)
        : undefined,
    }
  }

  return createEmptyStats()
}

function maybePruneStats(
  stats: AdMuteStats,
  pruneBefore: number,
  now: number,
): number {
  const lastPrunedAt = stats.lastPrunedAt ?? 0
  if (now - lastPrunedAt < 24 * 60 * 60 * 1000) {
    return lastPrunedAt
  }

  for (const channel of stats.channels) {
    channel.log = channel.log.filter((ts) => ts >= pruneBefore)
  }

  return now
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

loadSettings()
loadAudioPreference()

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
