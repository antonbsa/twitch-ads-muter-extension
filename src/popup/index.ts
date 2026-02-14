import type { LiveData, GetDataResponse, AdMuteStats } from '../types'
import { AUDIO_NOTIFICATION_KEY } from '../types'

function mustGetElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) {
    throw new Error(`Missing required element: ${id}`)
  }
  return el as T
}

const channelEl = mustGetElement<HTMLElement>('channel')
const notifyToggleEl = mustGetElement<HTMLButtonElement>('notifyToggle')
const mutedTodayEl = mustGetElement<HTMLParagraphElement>('mutedToday')
const mutedTotalEl = mustGetElement<HTMLParagraphElement>('mutedTotal')
const mutedTodayValueEl =
  mutedTodayEl.querySelector<HTMLSpanElement>('span') ??
  mustGetElement<HTMLSpanElement>('mutedTodayValue')
const mutedTotalValueEl =
  mutedTotalEl.querySelector<HTMLSpanElement>('span') ??
  mustGetElement<HTMLSpanElement>('mutedTotalValue')
const loadingClass = 'loading-dots'

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

function setStatsUnavailable(): void {
  mutedTodayValueEl.textContent = '-'
  mutedTotalValueEl.textContent = '-'
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
    setStatsUnavailable()
    return
  }

  const todayStart = getStartOfToday()
  const todayCount = channelStats.log.filter((ts) => ts >= todayStart).length
  const totalCount = Math.max(0, Number(channelStats.allTimeCount ?? 0))

  mutedTodayValueEl.textContent = String(todayCount)
  mutedTotalValueEl.textContent = String(totalCount)
}

async function fetchCurrentChannel(): Promise<void> {
  setTextWithLoading(channelEl, 'Auto-checking current channel...')
  setStatsUnavailable()

  const tab = await getActiveTab()
  if (!tab || !tab.id) {
    setTextWithLoading(channelEl, 'No active tab found.')
    setStatsUnavailable()
    return
  }

  const urlChannel = getChannelFromTabUrl(tab.url)

  try {
    const response: GetDataResponse | undefined = await chrome.tabs.sendMessage(
      tab.id,
      { type: 'getData', wait: true },
    )

    if (!response || response.ok !== true) {
      setTextWithLoading(channelEl, 'Could not read Twitch data.')
      if (!urlChannel) {
        setStatsUnavailable()
      }
      return
    }

    renderChannel(response.data)
    updateMuteStatsFromStats(response.data.channel, response.stats)
  } catch (error) {
    setTextWithLoading(channelEl, 'Content script not available on this page.')
    if (!urlChannel) {
      setStatsUnavailable()
    }
  }
}

let notificationsEnabled = true
updateToggleUI(notificationsEnabled)
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

notifyToggleEl.addEventListener('click', () => {
  notifyToggleEl.dataset.animate = 'true'
  notificationsEnabled = !notificationsEnabled
  updateToggleUI(notificationsEnabled)
  chrome.storage.local.set({ [AUDIO_NOTIFICATION_KEY]: notificationsEnabled })
  setTimeout(() => {
    notifyToggleEl.dataset.animate = 'false'
  }, 200)
})

loadNotificationPreference()
console.log('[Twitch ads muter] popup opened')
fetchCurrentChannel()
