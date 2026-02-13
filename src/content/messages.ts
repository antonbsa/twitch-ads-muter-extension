import type { GetDataMessage, GetDataResponse } from '../types'
import { AUDIO_NOTIFICATION_KEY, AD_MUTE_STATS_KEY } from '../types'
import { logger } from '../utils/logger'
import {
  collectLiveData,
  getLastLiveData,
  hasAnyLiveField,
  waitForElements,
} from './live-data'

export function registerMessageHandlers(): void {
  chrome.runtime.onMessage.addListener(
    async (
      message: GetDataMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: GetDataResponse) => void,
    ) => {
      if (message?.type === 'getData') {
        const wait = Boolean(message.wait)
        logger.log(
          `[Twitch ads muter] - Bytes in use: ${JSON.stringify(
            await chrome.storage.local.getBytesInUse([
              AUDIO_NOTIFICATION_KEY,
              AD_MUTE_STATS_KEY,
            ]),
          )}`,
        )

        if (wait) {
          if (hasAnyLiveField(getLastLiveData())) {
            sendResponse({ ok: true, data: collectLiveData() })
            return
          }

          waitForElements().then(() => {
            const data = collectLiveData()
            sendResponse({ ok: true, data })
          })
          return true
        }

        const data = collectLiveData()
        sendResponse({ ok: true, data })
      }
    },
  )
}
