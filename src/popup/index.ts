import type { LiveData, GetDataResponse } from '../types'

function mustGetElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) {
    throw new Error(`Missing required element: ${id}`)
  }
  return el as T
}

const statusEl = mustGetElement<HTMLElement>('status')
const liveTimeEl = mustGetElement<HTMLSpanElement>('liveTime')
const viewersCountEl = mustGetElement<HTMLSpanElement>('viewersCount')

function setStatus(message: string): void {
  statusEl.textContent = message
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

function renderValues(data: LiveData | null): void {
  liveTimeEl.textContent = data?.liveTime ?? '--'
  viewersCountEl.textContent = data?.viewersText ?? '--'
}

async function fetchCurrentChannel(): Promise<void> {
  setStatus('Checking active tab...')

  const tab = await getActiveTab()
  if (!tab || !tab.id) {
    setStatus('No active tab found.')
    renderValues(null)
    return
  }

  try {
    const response: GetDataResponse | undefined = await chrome.tabs.sendMessage(
      tab.id,
      { type: 'getData', wait: true },
    )

    if (!response || response.ok !== true) {
      setStatus('Could not read Twitch data.')
      renderValues(null)
      return
    }

    renderValues(response.data)
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    setStatus(`Loaded at ${timestamp}`)
  } catch (error) {
    setStatus('Content script not available on this page.')
    renderValues(null)
  }
}

fetchCurrentChannel()
