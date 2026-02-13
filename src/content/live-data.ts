import type { LiveData } from '../types'
import { logger } from '../utils/logger'
import { SELECTORS, hasLiveDataElements } from './selectors'

let lastLiveData: LiveData | null = null

export function getLastLiveData(): LiveData | null {
  return lastLiveData
}

export function getChannelFromUrl(): string | null {
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

export function hasAnyLiveField(data: LiveData | null): boolean {
  if (!data) return false
  return Boolean(data.viewersText || data.liveTime)
}

export function collectLiveData(): LiveData {
  const data = updateLiveDataCache()
  logger.log(data)

  return data
}

export function waitForElements(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve) => {
    if (hasLiveDataElements()) {
      resolve()
      return
    }

    const observer = new MutationObserver(() => {
      if (hasLiveDataElements()) {
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

export function startLiveDataObserver(): void {
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
