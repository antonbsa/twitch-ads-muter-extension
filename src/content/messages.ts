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
        logger.log('Received getData message', message)
        const wait = Boolean(message.wait)
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

          waitForElements().then(() => {
            const data = collectLiveData()
            sendResponse({ ok: true, data, stats })
          })
          return true
        }

        const data = collectLiveData()
        sendResponse({ ok: true, data, stats })
      }
    },
  )
}
