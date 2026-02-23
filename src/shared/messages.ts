import type { GetDataMessage, GetDataResponse, PopupLogMessage } from '../types'

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

export async function requestLiveData(
  tabId: number,
  options?: { wait?: boolean },
): Promise<GetDataResponse | undefined> {
  const payload: GetDataMessage = {
    type: 'getData',
    wait: Boolean(options?.wait),
  }

  try {
    const response: GetDataResponse | undefined = await chrome.tabs.sendMessage(
      tabId,
      payload,
    )
    return response
  } catch {
    return undefined
  }
}

export function registerMessageHandlers(handlers: {
  onGetData: (
    message: GetDataMessage,
  ) => Promise<GetDataResponse> | GetDataResponse
  onPopupLog: (message: PopupLogMessage) => void
}): void {
  chrome.runtime.onMessage.addListener(
    (
      message: GetDataMessage | PopupLogMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: GetDataResponse) => void,
    ) => {
      if ((message as PopupLogMessage)?.type === 'popupLog') {
        handlers.onPopupLog(message as PopupLogMessage)
        return
      }

      if ((message as GetDataMessage)?.type === 'getData') {
        // Must return true synchronously; async listeners return a Promise and can close the channel early.
        ;(async () => {
          const response = await handlers.onGetData(message as GetDataMessage)
          sendResponse(response)
        })()
        return true
      }
    },
  )
}
