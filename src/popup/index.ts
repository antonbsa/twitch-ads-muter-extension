import type {
  LiveData,
  GetDataResponse,
  AdMuteStats,
  PopupLogMessage,
} from '../types'
import {
  AUDIO_NOTIFICATION_KEY,
  AD_MUTE_ENABLED_KEY,
  AD_MUTE_STATS_KEY,
} from '../types'
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
  mutedTodayEl.querySelector<HTMLSpanElement>('.stat-value') ??
  mustGetElement<HTMLSpanElement>('mutedTodayValue')
const mutedTotalValueEl =
  mutedTotalEl.querySelector<HTMLSpanElement>('.stat-value') ??
  mustGetElement<HTMLSpanElement>('mutedTotalValue')
const mutedTotalSubEl = mustGetElement<HTMLSpanElement>('mutedTotalSub')
const mutedTimeValueEl =
  mutedTimeEl.querySelector<HTMLSpanElement>('.stat-value') ??
  mustGetElement<HTMLSpanElement>('mutedTimeValue')
const mutedTimeSubEl = mustGetElement<HTMLSpanElement>('mutedTimeSub')
const loadingClass = 'loading-dots'

let cachedStats: AdMuteStats | undefined
let cachedStatsSerialized: string | null = null
let currentChannel: string | null = null

function t(key: string, substitutions?: string | string[]): string {
  const message = chrome.i18n.getMessage(key, substitutions)
  return message || key
}

function initI18n(): void {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n
    if (!key) return
    const message = t(key)
    if (message) {
      el.textContent = message
    }
  })
}

async function logI18nLocale(): Promise<void> {
  const locale = chrome.i18n.getUILanguage()
  await logToActiveTab('i18n UI locale', { locale })
}

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
  const stateLabel = t(enabled ? 'stateOn' : 'stateOff')
  notifyToggleEl.setAttribute('aria-label', t('ariaToggleNotify', [stateLabel]))
}

function updateMuteToggleUI(enabled: boolean): void {
  muteToggleEl.dataset.state = enabled ? 'on' : 'off'
  muteToggleEl.setAttribute('aria-pressed', enabled ? 'true' : 'false')
  const stateLabel = t(enabled ? 'stateOn' : 'stateOff')
  muteToggleEl.setAttribute('aria-label', t('ariaToggleMute', [stateLabel]))
}

function setAudioToggleDisabled(disabled: boolean): void {
  notifyToggleEl.classList.toggle('is-disabled', disabled)
  notifyToggleEl.setAttribute('aria-disabled', disabled ? 'true' : 'false')
}

function setStatsUnavailable(): void {
  mutedTodayValueEl.textContent = '-'
  mutedTotalValueEl.textContent = '-'
  mutedTimeValueEl.textContent = '-'
  mutedTotalSubEl.textContent = ''
  mutedTimeSubEl.textContent = ''
  mutedTotalSubEl.classList.add('is-hidden')
  mutedTimeSubEl.classList.add('is-hidden')
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
    mutedTotalSubEl.textContent = ''
    mutedTimeSubEl.textContent = ''
    mutedTotalSubEl.classList.add('is-hidden')
    mutedTimeSubEl.classList.add('is-hidden')
    return
  }

  const todayStart = getStartOfToday()
  const todayCount = channelStats.log.filter((ts) => ts >= todayStart).length
  const last14DaysStart = Date.now() - 14 * 24 * 60 * 60 * 1000
  const last14DaysCount = channelStats.log.filter(
    (ts) => ts >= last14DaysStart,
  ).length
  const totalCount = Math.max(0, Number(channelStats.allTimeCount ?? 0))
  const totalMutedMs = Math.max(0, Number(channelStats.allTimeMutedMs ?? 0))
  const averageMutedMs =
    totalCount > 0 ? Math.round(totalMutedMs / totalCount) : 0

  mutedTodayValueEl.textContent = String(todayCount)
  mutedTotalValueEl.textContent = String(totalCount)
  mutedTimeValueEl.textContent =
    totalMutedMs > 0 ? formatDuration(totalMutedMs) : '0'
  mutedTotalSubEl.textContent = t('statsLast14Days', [String(last14DaysCount)])
  mutedTotalSubEl.classList.toggle('is-hidden', last14DaysCount === 0)
  mutedTimeSubEl.textContent = t('statsAverage', [
    formatDuration(averageMutedMs),
  ])
  mutedTimeSubEl.classList.toggle('is-hidden', averageMutedMs === 0)
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
    const stored = await chrome.storage.local.get(AD_MUTE_STATS_KEY)
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
  setTextWithLoading(channelEl, t('channelAutoChecking'))
  setStatsUnavailable()

  const tab = await getActiveTab()
  if (!tab || !tab.id) {
    logToActiveTab('fetchCurrentChannel: no active tab or tab id', tab, 'warn')
    setTextWithLoading(channelEl, t('channelNoActiveTab'))
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
      setTextWithLoading(channelEl, t('channelCannotRead'))
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
    setTextWithLoading(channelEl, t('channelContentUnavailable'))
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

initI18n()
logI18nLocale()

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
