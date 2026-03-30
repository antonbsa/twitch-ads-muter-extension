import type { PopupLogMessage } from '../types'
import { registerPopupLogHandler } from '../shared/messages'
import { logger } from '../utils/logger'

export function registerMessageHandlers(): void {
  registerPopupLogHandler((message: PopupLogMessage) => {
    const level = message.level ?? 'log'
    logger[level](message.message, message.data)
  })
}
