import type { AdMuteStats } from '../types'
import { AD_MUTE_STATS_KEY } from '../types'
import { logger } from '../utils/logger'

export async function recordMutedAd(
  channel: string | null,
  durationMs?: number,
): Promise<void> {
  const key = (channel ?? 'unknown').toLowerCase()
  const timestamp = Date.now()
  const pruneBefore = timestamp - 30 * 24 * 60 * 60 * 1000
  const resolvedDurationMs =
    Number.isFinite(durationMs) && Number(durationMs) >= 0
      ? Number(durationMs)
      : null

  try {
    logger.log('Loading muted ad stats from storage', {
      key,
      durationMs: resolvedDurationMs,
    })
    const stored = await chrome.storage.local.get(AD_MUTE_STATS_KEY)
    const stats = normalizeMuteStats(stored[AD_MUTE_STATS_KEY])
    const channelStats =
      stats.channels.find((item) => item.channel === key) ??
      createChannelStats(key)

    channelStats.allTimeCount += 1
    channelStats.lastMutedAt = timestamp
    channelStats.log.push(timestamp)
    if (resolvedDurationMs !== null) {
      channelStats.allTimeMutedMs =
        (channelStats.allTimeMutedMs ?? 0) + resolvedDurationMs
      channelStats.muteLog = [
        ...(channelStats.muteLog ?? []),
        { timestamp, durationMs: resolvedDurationMs },
      ]
      stats.allTimeMutedMs = (stats.allTimeMutedMs ?? 0) + resolvedDurationMs
    }

    if (!stats.channels.includes(channelStats)) {
      stats.channels.push(channelStats)
    }

    stats.allTimeTotal += 1
    stats.lastPrunedAt = maybePruneStats(stats, pruneBefore, timestamp)

    await chrome.storage.local.set({ [AD_MUTE_STATS_KEY]: stats })
    logger.log('Muted ad stats saved', {
      key,
      channelStats,
      allTimeTotal: stats.allTimeTotal,
      allTimeMutedMs: stats.allTimeMutedMs ?? 0,
    })
  } catch (error) {
    logger.error('Failed to persist muted ad stats', {
      channel,
      key,
      durationMs,
      error,
    })
  }
}

function createEmptyStats(): AdMuteStats {
  return {
    version: 3,
    allTimeTotal: 0,
    allTimeMutedMs: 0,
    channels: [],
  }
}

function createChannelStats(channel: string): AdMuteStats['channels'][number] {
  return {
    channel,
    allTimeCount: 0,
    allTimeMutedMs: 0,
    log: [],
    muteLog: [],
  }
}

function normalizeMuteStats(value: unknown): AdMuteStats {
  if (!value || typeof value !== 'object') {
    return createEmptyStats()
  }

  const candidate = value as Partial<AdMuteStats>
  if (
    ((candidate.version as number) === 2 ||
      (candidate.version as number) === 3) &&
    Array.isArray(candidate.channels)
  ) {
    return {
      version: 3,
      allTimeTotal: Number(candidate.allTimeTotal ?? 0),
      allTimeMutedMs: Number(candidate.allTimeMutedMs ?? 0),
      channels: candidate.channels
        .filter((item) => item && typeof item.channel === 'string')
        .map((item) => ({
          channel: item.channel.toLowerCase(),
          allTimeCount: Number(item.allTimeCount ?? 0),
          allTimeMutedMs: Number(item.allTimeMutedMs ?? 0),
          log: Array.isArray(item.log)
            ? item.log.filter((ts) => Number.isFinite(ts))
            : [],
          muteLog: Array.isArray(item.muteLog)
            ? item.muteLog
                .filter(
                  (entry) =>
                    entry &&
                    Number.isFinite(entry.timestamp) &&
                    Number.isFinite(entry.durationMs) &&
                    Number(entry.durationMs) >= 0,
                )
                .map((entry) => ({
                  timestamp: Number(entry.timestamp),
                  durationMs: Number(entry.durationMs),
                }))
            : [],
          lastMutedAt: Number.isFinite(item.lastMutedAt)
            ? Number(item.lastMutedAt)
            : undefined,
        })),
      lastPrunedAt: Number.isFinite(candidate.lastPrunedAt)
        ? Number(candidate.lastPrunedAt)
        : undefined,
    }
  }

  return createEmptyStats()
}

function maybePruneStats(
  stats: AdMuteStats,
  pruneBefore: number,
  now: number,
): number {
  const lastPrunedAt = stats.lastPrunedAt ?? 0
  if (now - lastPrunedAt < 24 * 60 * 60 * 1000) {
    return lastPrunedAt
  }

  for (const channel of stats.channels) {
    channel.log = channel.log.filter((ts) => ts >= pruneBefore)
    channel.muteLog = (channel.muteLog ?? []).filter(
      (entry) => entry.timestamp >= pruneBefore,
    )
  }

  return now
}
