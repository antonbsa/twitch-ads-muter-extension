import type { AdMuteStats, PopupLogMessage } from '../types'
import {
  AUDIO_NOTIFICATION_KEY,
  AD_MUTE_ENABLED_KEY,
  AD_MUTE_STATS_KEY,
  LANG_KEY,
} from '../types'
import { createLocaleController } from '../content/locale'
import { sendPopupLog } from '../shared/messages'

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
const settingsButtonEl = mustGetElement<HTMLButtonElement>('settingsButton')
const settingsMenuEl = mustGetElement<HTMLDivElement>('settingsMenu')
const languageToggleEl = mustGetElement<HTMLButtonElement>('languageToggle')
const mutedTodayEl = mustGetElement<HTMLParagraphElement>('mutedToday')
const mutedTotalEl = mustGetElement<HTMLParagraphElement>('mutedTotal')
const mutedTimeEl = mustGetElement<HTMLParagraphElement>('mutedTime')
const mutedTodayValueEl =
  mutedTodayEl.querySelector<HTMLSpanElement>('.stat-value') ??
  mustGetElement<HTMLSpanElement>('mutedTodayValue')
const mutedTodaySubEl = mustGetElement<HTMLSpanElement>('mutedTodaySub')
const mutedTotalValueEl =
  mutedTotalEl.querySelector<HTMLSpanElement>('.stat-value') ??
  mustGetElement<HTMLSpanElement>('mutedTotalValue')
const mutedTotalSubEl = mustGetElement<HTMLSpanElement>('mutedTotalSub')
const mutedTimeValueEl =
  mutedTimeEl.querySelector<HTMLSpanElement>('.stat-value') ??
  mustGetElement<HTMLSpanElement>('mutedTimeValue')
const mutedTimeSubEl = mustGetElement<HTMLSpanElement>('mutedTimeSub')
const loadingClass = 'loading-dots'
const RECENT_STATS_DAYS = 14

let cachedStats: AdMuteStats | undefined
let currentChannel: string | null = null
let channelStatusKey: string | null = null
const localeController = createLocaleController(LANG_KEY)
const { t, initI18n } = localeController

function updateLanguageToggleLabel(): void {
  const displayName = localeController.getLocaleDisplayName()
  const label = t('menuLanguageLabel', [displayName])
  languageToggleEl.textContent = label
  languageToggleEl.setAttribute('aria-label', label)
}

function applyLocale(): void {
  initI18n()
  updateToggleUI(notificationsEnabled)
  updateMuteToggleUI(muteAdsEnabled)
  updateLanguageToggleLabel()
  if (channelStatusKey) {
    setTextWithLoading(channelEl, t(channelStatusKey))
  }
  if (currentChannel) {
    updateMuteStatsFromStats(currentChannel, cachedStats)
  }
}

async function setLocale(locale: string, persist: boolean): Promise<void> {
  await localeController.setLocale(locale, persist)
  applyLocale()
}

async function loadLocalePreference(): Promise<void> {
  await localeController.loadLocalePreference()
  applyLocale()
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

function setChannelStatus(key: string): void {
  channelStatusKey = key
  setTextWithLoading(channelEl, t(key))
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
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

let settingsMenuOpen = false

function setSettingsMenuOpen(open: boolean): void {
  settingsMenuOpen = open
  settingsMenuEl.classList.toggle('is-hidden', !open)
  settingsButtonEl.setAttribute('aria-expanded', open ? 'true' : 'false')
}

function setStatsUnavailable(): void {
  mutedTodayValueEl.textContent = '-'
  mutedTotalValueEl.textContent = '-'
  mutedTimeValueEl.textContent = '-'
  mutedTodaySubEl.textContent = ''
  mutedTotalSubEl.textContent = ''
  mutedTimeSubEl.textContent = ''
  mutedTodaySubEl.classList.add('is-hidden')
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

  if (stats && !Array.isArray(stats.channels)) {
    setStatsUnavailable()
    return
  }

  const key = channel.toLowerCase()
  const channelStats = (stats?.channels ?? []).find(
    (item) => item.channel === key,
  )
  if (!channelStats) {
    mutedTodayValueEl.textContent = '0'
    mutedTotalValueEl.textContent = '0'
    mutedTimeValueEl.textContent = '0'
    mutedTodaySubEl.textContent = ''
    mutedTotalSubEl.textContent = ''
    mutedTimeSubEl.textContent = ''
    mutedTodaySubEl.classList.add('is-hidden')
    mutedTotalSubEl.classList.add('is-hidden')
    mutedTimeSubEl.classList.add('is-hidden')
    return
  }

  const todayStart = getStartOfToday()
  const todayCount = channelStats.log.filter((ts) => ts >= todayStart).length
  const todayMuteEntries = (channelStats.muteLog ?? []).filter(
    (entry) => entry.timestamp >= todayStart,
  )
  const todayMutedMs = todayMuteEntries.reduce(
    (total, entry) => total + Math.max(0, Number(entry.durationMs ?? 0)),
    0,
  )
  const todayAverageMutedMs =
    todayMuteEntries.length > 0
      ? Math.round(todayMutedMs / todayMuteEntries.length)
      : 0
  const recentDaysStart = Date.now() - RECENT_STATS_DAYS * 24 * 60 * 60 * 1000
  const recentDaysCount = channelStats.log.filter(
    (ts) => ts >= recentDaysStart,
  ).length
  const totalCount = Math.max(0, Number(channelStats.allTimeCount ?? 0))
  const totalMutedMs = Math.max(0, Number(channelStats.allTimeMutedMs ?? 0))
  const averageMutedMs =
    totalCount > 0 ? Math.round(totalMutedMs / totalCount) : 0

  mutedTodayValueEl.textContent = String(todayCount)
  if (todayMuteEntries.length > 0) {
    mutedTodaySubEl.textContent = t('statsTodayDurationAverage', [
      formatDuration(todayMutedMs),
      formatDuration(todayAverageMutedMs),
    ])
    mutedTodaySubEl.classList.remove('is-hidden')
  } else {
    mutedTodaySubEl.textContent = ''
    mutedTodaySubEl.classList.add('is-hidden')
  }
  mutedTotalValueEl.textContent = String(totalCount)
  mutedTimeValueEl.textContent =
    totalMutedMs > 0 ? formatDuration(totalMutedMs) : '0'
  mutedTotalSubEl.textContent =
    totalCount === recentDaysCount
      ? t('statsLastDaysLabel', [String(RECENT_STATS_DAYS)])
      : t('statsLastDaysCount', [
          String(recentDaysCount),
          String(RECENT_STATS_DAYS),
        ])
  mutedTotalSubEl.classList.toggle('is-hidden', recentDaysCount === 0)
  mutedTimeSubEl.textContent = t('statsAverage', [
    formatDuration(averageMutedMs),
  ])
  mutedTimeSubEl.classList.toggle('is-hidden', averageMutedMs === 0)
}

async function loadStatsFromStorage(): Promise<void> {
  if (!currentChannel) {
    setStatsUnavailable()
    return
  }

  try {
    const stored = await chrome.storage.local.get(AD_MUTE_STATS_KEY)
    const stats = stored.adMuteStats as AdMuteStats | undefined
    cachedStats = stats
    updateMuteStatsFromStats(currentChannel, cachedStats)
  } catch {
    setStatsUnavailable()
  }
}

async function syncActiveChannel(): Promise<void> {
  const tab = await getActiveTab()
  if (!tab) {
    currentChannel = null
    await logToActiveTab('syncActiveChannel: no active tab', undefined, 'warn')
    setChannelStatus('channelNoActiveTab')
    setStatsUnavailable()
    return
  }

  currentChannel = getChannelFromTabUrl(tab.url)
  await logToActiveTab('syncActiveChannel: active tab', {
    url: tab.url,
    channel: currentChannel,
  })
  if (!currentChannel) {
    setChannelStatus('channelCannotRead')
    setStatsUnavailable()
    return
  }

  channelStatusKey = null
  setTextWithLoading(channelEl, currentChannel)
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

settingsButtonEl.addEventListener('click', (event) => {
  event.stopPropagation()
  setSettingsMenuOpen(!settingsMenuOpen)
})

languageToggleEl.addEventListener('click', async (event) => {
  event.stopPropagation()
  const nextLocale = localeController.getNextLocale()
  await setLocale(nextLocale, true)
})

document.addEventListener('click', (event) => {
  if (!settingsMenuOpen) return
  const target = event.target as Node
  if (settingsMenuEl.contains(target) || settingsButtonEl.contains(target)) {
    return
  }
  setSettingsMenuOpen(false)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setSettingsMenuOpen(false)
  }
})

async function refreshPopupState(): Promise<void> {
  setChannelStatus('channelAutoChecking')
  setStatsUnavailable()
  await syncActiveChannel()
  if (!currentChannel) return
  await loadStatsFromStorage()
}

async function initPopup(): Promise<void> {
  await loadLocalePreference()
  await loadNotificationPreference()
  await loadMutePreference()
  await logToActiveTab('Popup opened')
  await refreshPopupState()
}

initPopup()
