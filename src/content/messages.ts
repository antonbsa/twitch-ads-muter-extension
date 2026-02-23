import type { GetDataMessage, GetDataResponse, PopupLogMessage } from '../types'
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
    (
      message: GetDataMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: GetDataResponse) => void,
    ) => {
      if ((message as PopupLogMessage)?.type === 'popupLog') {
        const payload = message as PopupLogMessage
        const prefix = '[Twitch ads muter]'
        const level = payload.level ?? 'log'
        const logArgs = payload.data
          ? [`${prefix} ${payload.message}`, payload.data]
          : [`${prefix} ${payload.message}`]

        if (level === 'warn') console.warn(...logArgs)
        else if (level === 'error') console.error(...logArgs)
        else console.log(...logArgs)
        return
      }

      if (message?.type === 'getData') {
        const wait = Boolean(message.wait)

        // Must return true synchronously; async listeners return a Promise and can close the channel early.
        ;(async () => {
          logger.log('Received getData message', message)
          const statsStored = await chrome.storage.local.get(AD_MUTE_STATS_KEY)
          const stats = statsStored[AD_MUTE_STATS_KEY]
          logger.log(
            `Bytes in use: ${JSON.stringify(
              await chrome.storage.local.getBytesInUse([
                AUDIO_NOTIFICATION_KEY,
                AD_MUTE_STATS_KEY,
              ]),
            )}`,
          )

          if (wait) {
            const liveData = getLastLiveData()

            if (hasAnyLiveField(liveData)) {
              sendResponse({ ok: true, data: collectLiveData(), stats })
              return
            }

            await waitForElements()
            const data = collectLiveData()
            sendResponse({ ok: true, data, stats })
            return
          }

          const data = collectLiveData()
          sendResponse({ ok: true, data, stats })
        })()

        return true
      }
    },
  )
}
