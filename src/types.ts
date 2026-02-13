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

export type GetDataMessage = {
  type?: string
  wait?: boolean
}

export type GetDataResponse = { ok: true; data: LiveData } | { ok: false }

export const AUDIO_NOTIFICATION_KEY = 'audioNotificationsEnabled'
export const AD_MUTE_STATS_KEY = 'adMuteStats'

export type AdMuteStats = {
  version: 2
  allTimeTotal: number
  channels: Array<{
    channel: string
    allTimeCount: number
    log: number[]
    lastMutedAt?: number
  }>
  lastPrunedAt?: number
}
