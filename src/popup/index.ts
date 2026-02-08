import type { LiveData, GetDataResponse } from '../types'
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

async function fetchCurrentChannel(): Promise<void> {
  setTextWithLoading(channelEl, 'Auto-checking current channel...')

  const tab = await getActiveTab()
  if (!tab || !tab.id) {
    setTextWithLoading(channelEl, 'No active tab found.')
    return
  }

  try {
    const response: GetDataResponse | undefined = await chrome.tabs.sendMessage(
      tab.id,
      { type: 'getData', wait: true },
    )

    if (!response || response.ok !== true) {
      setTextWithLoading(channelEl, 'Could not read Twitch data.')
      return
    }

    renderChannel(response.data)
  } catch (error) {
    setTextWithLoading(channelEl, 'Content script not available on this page.')
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
fetchCurrentChannel()
