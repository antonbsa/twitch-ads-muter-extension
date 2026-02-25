import type {
  LiveData,
  GetDataResponse,
  AdMuteStats,
  PopupLogMessage,
} from '../types'
import { AUDIO_NOTIFICATION_KEY, AD_MUTE_ENABLED_KEY } from '../types'
import { requestLiveData, sendPopupLog } from '../shared/messages'
import { logger } from '../utils/logger'

function mustGetElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) {
    throw new Error(`Missing required element: ${id}`)
  }
  return el as T
}

const channelEl = mustGetElement<HTMLElement>('channel')
const muteToggleEl = mustGetElement<HTMLButtonElement>('muteToggle')
const notifyToggleEl = mustGetElement<HTMLButtonElement>('notifyToggle')
const mutedTodayEl = mustGetElement<HTMLParagraphElement>('mutedToday')
const mutedTotalEl = mustGetElement<HTMLParagraphElement>('mutedTotal')
const mutedTimeEl = mustGetElement<HTMLParagraphElement>('mutedTime')
const mutedTodayValueEl =
  mutedTodayEl.querySelector<HTMLSpanElement>('span') ??
  mustGetElement<HTMLSpanElement>('mutedTodayValue')
const mutedTotalValueEl =
  mutedTotalEl.querySelector<HTMLSpanElement>('span') ??
  mustGetElement<HTMLSpanElement>('mutedTotalValue')
const mutedTimeValueEl =
  mutedTimeEl.querySelector<HTMLSpanElement>('span') ??
  mustGetElement<HTMLSpanElement>('mutedTimeValue')
const loadingClass = 'loading-dots'

let cachedStats: AdMuteStats | undefined
let cachedStatsSerialized: string | null = null
let currentChannel: string | null = null

function setTextWithLoading(el: HTMLElement, message: string): void {
  if (message.endsWith('...')) {
    el.textContent = message.slice(0, -3)
    el.classList.add(loadingClass)
    return
  }
  el.textContent = message
  el.classList.remove(loadingClass)
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

function renderChannel(data: LiveData | null): void {
  if (data?.channel) {
    setTextWithLoading(channelEl, data.channel)
  }
}

function updateToggleUI(enabled: boolean): void {
  notifyToggleEl.dataset.state = enabled ? 'on' : 'off'
  notifyToggleEl.setAttribute('aria-pressed', enabled ? 'true' : 'false')
  notifyToggleEl.setAttribute(
    'aria-label',
    `Audio notifications: ${enabled ? 'On' : 'Off'}`,
  )
}

function updateMuteToggleUI(enabled: boolean): void {
  muteToggleEl.dataset.state = enabled ? 'on' : 'off'
  muteToggleEl.setAttribute('aria-pressed', enabled ? 'true' : 'false')
  muteToggleEl.setAttribute('aria-label', `Mute ads: ${enabled ? 'On' : 'Off'}`)
}

function setAudioToggleDisabled(disabled: boolean): void {
  notifyToggleEl.classList.toggle('is-disabled', disabled)
  notifyToggleEl.setAttribute('aria-disabled', disabled ? 'true' : 'false')
}

function setStatsUnavailable(): void {
  mutedTodayValueEl.textContent = '-'
  mutedTotalValueEl.textContent = '-'
  mutedTimeValueEl.textContent = '-'
}

function getChannelFromTabUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.endsWith('twitch.tv')) return null
    const path = parsed.pathname.replace(/^\/+|\/+$/g, '')
    if (!path) return null
    const [channel] = path.split('/')
    return channel || null
  } catch {
    return null
  }
}

function getStartOfToday(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m${seconds}s`
  }
  return `${seconds}s`
}

function updateMuteStatsFromStats(
  channel: string | null,
  stats: AdMuteStats | undefined,
): void {
  if (!channel) {
    setStatsUnavailable()
    return
  }

  if (!stats || stats.version !== 2 || !Array.isArray(stats.channels)) {
    setStatsUnavailable()
    return
  }

  const key = channel.toLowerCase()
  const channelStats = stats.channels.find((item) => item.channel === key)
  if (!channelStats) {
    mutedTodayValueEl.textContent = '0'
    mutedTotalValueEl.textContent = '0'
    mutedTimeValueEl.textContent = '0'
    return
  }

  const todayStart = getStartOfToday()
  const todayCount = channelStats.log.filter((ts) => ts >= todayStart).length
  const totalCount = Math.max(0, Number(channelStats.allTimeCount ?? 0))
  const totalMutedMs = Math.max(0, Number(channelStats.allTimeMutedMs ?? 0))
  const averageMutedMs =
    totalCount > 0 ? Math.round(totalMutedMs / totalCount) : 0

  mutedTodayValueEl.textContent = String(todayCount)
  mutedTotalValueEl.textContent = String(totalCount)
  mutedTimeValueEl.textContent =
    totalMutedMs > 0
      ? `${formatDuration(totalMutedMs)} (${formatDuration(averageMutedMs)} avg)`
      : '0'
}

async function logToActiveTab(
  message: string,
  data?: unknown,
  level: PopupLogMessage['level'] = 'log',
): Promise<void> {
  const tab = await getActiveTab()
  if (!tab?.id) return

  await sendPopupLog(tab.id, message, data, level)
}

async function loadStatsFromStorage(): Promise<void> {
  if (!currentChannel) {
    setStatsUnavailable()
    return
  }

  try {
    const stored = await chrome.storage.local.get('adMuteStats')
    const stats = stored.adMuteStats as AdMuteStats | undefined
    const serialized = stats ? JSON.stringify(stats) : null

    if (serialized !== cachedStatsSerialized) {
      cachedStatsSerialized = serialized
      cachedStats = stats
      updateMuteStatsFromStats(currentChannel, cachedStats)
    }
  } catch {
    setStatsUnavailable()
  }
}

async function initStatsForActiveTab(): Promise<void> {
  const tab = await getActiveTab()
  if (!tab) {
    logToActiveTab('initStatsForActiveTab: no active tab', undefined, 'warn')
    setStatsUnavailable()
    return
  }

  currentChannel = getChannelFromTabUrl(tab.url)
  logToActiveTab('initStatsForActiveTab: active tab', {
    url: tab.url,
    channel: currentChannel,
  })
  if (!currentChannel) {
    setStatsUnavailable()
    return
  }

  if (cachedStats) {
    updateMuteStatsFromStats(currentChannel, cachedStats)
  } else {
    setStatsUnavailable()
  }

  await loadStatsFromStorage()
}

async function fetchCurrentChannel(): Promise<void> {
  setTextWithLoading(channelEl, 'Auto-checking current channel...')
  setStatsUnavailable()

  const tab = await getActiveTab()
  if (!tab || !tab.id) {
    logToActiveTab('fetchCurrentChannel: no active tab or tab id', tab, 'warn')
    setTextWithLoading(channelEl, 'No active tab found.')
    setStatsUnavailable()
    return
  }

  const urlChannel = getChannelFromTabUrl(tab.url)
  currentChannel = urlChannel
  logToActiveTab('fetchCurrentChannel: active tab', {
    url: tab.url,
    channel: urlChannel,
  })

  try {
    const response: GetDataResponse | undefined = await requestLiveData(
      tab.id,
      {
        wait: true,
      },
    )

    logToActiveTab('fetchCurrentChannel: getData response', response)

    if (!response || response.ok !== true) {
      setTextWithLoading(channelEl, 'Could not read Twitch data.')
      if (!urlChannel) {
        setStatsUnavailable()
      }
      return
    }

    renderChannel(response.data)
    if (response.data.channel) {
      if (response.data.channel !== currentChannel) {
        currentChannel = response.data.channel
      }

      if (cachedStats) {
        updateMuteStatsFromStats(currentChannel, cachedStats)
      } else {
        setStatsUnavailable()
      }

      await loadStatsFromStorage()
    }
  } catch (error) {
    logToActiveTab('fetchCurrentChannel: getData error', error, 'warn')
    setTextWithLoading(channelEl, 'Content script not available on this page.')
    if (!urlChannel) {
      setStatsUnavailable()
    }
  }
}

let notificationsEnabled = true
let muteAdsEnabled = true
updateToggleUI(notificationsEnabled)
updateMuteToggleUI(muteAdsEnabled)
setAudioToggleDisabled(!muteAdsEnabled)
notifyToggleEl.dataset.animate = 'false'

async function loadNotificationPreference(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(AUDIO_NOTIFICATION_KEY)
    const value = stored[AUDIO_NOTIFICATION_KEY]
    if (typeof value === 'boolean') {
      notificationsEnabled = value
      notifyToggleEl.dataset.animate = 'false'
      updateToggleUI(notificationsEnabled)
    }
  } catch {
    // Ignore storage errors; keep default on.
  }
}

async function loadMutePreference(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(AD_MUTE_ENABLED_KEY)
    const value = stored[AD_MUTE_ENABLED_KEY]
    if (typeof value === 'boolean') {
      muteAdsEnabled = value
      updateMuteToggleUI(muteAdsEnabled)
      setAudioToggleDisabled(!muteAdsEnabled)
    }
  } catch {
    // Ignore storage errors; keep default on.
  }
}

muteToggleEl.addEventListener('click', () => {
  muteToggleEl.dataset.animate = 'true'
  muteAdsEnabled = !muteAdsEnabled
  updateMuteToggleUI(muteAdsEnabled)
  setAudioToggleDisabled(!muteAdsEnabled)
  chrome.storage.local.set({ [AD_MUTE_ENABLED_KEY]: muteAdsEnabled })
  setTimeout(() => {
    muteToggleEl.dataset.animate = 'false'
  }, 200)
})

notifyToggleEl.addEventListener('click', () => {
  if (!muteAdsEnabled) return
  notifyToggleEl.dataset.animate = 'true'
  notificationsEnabled = !notificationsEnabled
  updateToggleUI(notificationsEnabled)
  chrome.storage.local.set({ [AUDIO_NOTIFICATION_KEY]: notificationsEnabled })
  setTimeout(() => {
    notifyToggleEl.dataset.animate = 'false'
  }, 200)
})

loadNotificationPreference()
loadMutePreference()
logger.log('Popup opened')
initStatsForActiveTab()
fetchCurrentChannel()
