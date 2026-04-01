import type { PopupLogMessage } from '../types'

export type PopupLogLevel = PopupLogMessage['level']

export async function sendPopupLog(
  tabId: number,
  message: string,
  data?: unknown,
  level: PopupLogLevel = 'log',
): Promise<void> {
  const payload: PopupLogMessage = {
    type: 'popupLog',
    level,
    message,
    data,
  }

  try {
    await chrome.tabs.sendMessage(tabId, payload)
  } catch {
    // Ignore if content script is not available on this tab.
  }
}

export function registerPopupLogHandler(
  handler: (message: PopupLogMessage) => void,
): void {
  chrome.runtime.onMessage.addListener((message: PopupLogMessage) => {
    if (message?.type !== 'popupLog') return

    handler(message)
    return undefined
  })
}
