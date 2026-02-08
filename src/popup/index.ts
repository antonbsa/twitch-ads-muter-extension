import type { LiveData, GetDataResponse } from '../types'

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

notifyToggleEl.addEventListener('click', () => {
  notificationsEnabled = !notificationsEnabled
  updateToggleUI(notificationsEnabled)
})

fetchCurrentChannel()
