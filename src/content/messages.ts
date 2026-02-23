import type { GetDataMessage, GetDataResponse, PopupLogMessage } from '../types'
import { AUDIO_NOTIFICATION_KEY, AD_MUTE_STATS_KEY } from '../types'
import { registerMessageHandlers as registerSharedHandlers } from '../shared/messages'
import { logger } from '../utils/logger'
import {
  collectLiveData,
  getLastLiveData,
  hasAnyLiveField,
  waitForElements,
} from './live-data'

export function registerMessageHandlers(): void {
  registerSharedHandlers({
    onPopupLog(message: PopupLogMessage) {
      const level = message.level ?? 'log'
      logger[level](message.message, message.data)
    },
    async onGetData(message: GetDataMessage): Promise<GetDataResponse> {
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
          return { ok: true, data: collectLiveData(), stats }
        }

        await waitForElements()
        const data = collectLiveData()
        return { ok: true, data, stats }
      }

      const data = collectLiveData()
      return { ok: true, data, stats }
    },
  })
}
