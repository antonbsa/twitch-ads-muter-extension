export type Settings = {
  DEBUG_MODE?: boolean
}

export type AdMuteStats = {
  version: 3
  allTimeTotal: number
  allTimeMutedMs?: number
  channels: Array<{
    channel: string
    allTimeCount: number
    allTimeMutedMs?: number
    log: number[]
    muteLog?: Array<{
      timestamp: number
      durationMs: number
    }>
    lastMutedAt?: number
  }>
  lastPrunedAt?: number
}

export type PopupLogMessage = {
  type: 'popupLog'
  level?: 'log' | 'warn' | 'error'
  message: string
  data?: unknown
}

export const AUDIO_NOTIFICATION_KEY = 'audioNotificationsEnabled'
export const AD_MUTE_ENABLED_KEY = 'adMuteEnabled'
export const AD_MUTE_STATS_KEY = 'adMuteStats'
export const LANG_KEY = 'lang'
