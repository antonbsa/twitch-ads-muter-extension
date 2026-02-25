export type Settings = {
  DEBUG_MODE?: boolean
}

export type LiveData = {
  channel: string | null
  viewersText: string | null
  viewers: number | null
  liveTime: string | null
  url: string
  timestamp: string
}

export type AdMuteStats = {
  version: 2
  allTimeTotal: number
  allTimeMutedMs?: number
  channels: Array<{
    channel: string
    allTimeCount: number
    allTimeMutedMs?: number
    log: number[]
    lastMutedAt?: number
  }>
  lastPrunedAt?: number
}

export type GetDataMessage = {
  type?: string
  wait?: boolean
}

export type GetDataResponse =
  | { ok: true; data: LiveData; stats?: AdMuteStats }
  | { ok: false }

export type PopupLogMessage = {
  type: 'popupLog'
  level?: 'log' | 'warn' | 'error'
  message: string
  data?: unknown
}

export const AUDIO_NOTIFICATION_KEY = 'audioNotificationsEnabled'
export const AD_MUTE_ENABLED_KEY = 'adMuteEnabled'
export const AD_MUTE_STATS_KEY = 'adMuteStats'
