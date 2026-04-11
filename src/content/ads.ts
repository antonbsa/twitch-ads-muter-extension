import { isAnyAdIndicatorPresent } from './selectors'
import { ensureMuted, ensureUnmuted } from './mute'
import { recordMutedAd } from './stats'
import { getChannelFromUrl } from './live-data'
import { isMuteAdsEnabled } from './preferences'
import { logger } from '../utils/logger'
let adActive = false
let mutedByExtension = false
let pendingMuteCount = false
let pendingChannel: string | null = null
let pendingMuteStartedAt: number | null = null

async function handleAdState(): Promise<void> {
  if (!isMuteAdsEnabled()) {
    if (adActive || mutedByExtension) {
      logger.log('Ad mute disabled while ad state was active; resetting state')
    }
    adActive = false
    mutedByExtension = false
    pendingMuteCount = false
    pendingChannel = null
    pendingMuteStartedAt = null
    return
  }
  const active = isAnyAdIndicatorPresent()

  if (active !== adActive) {
    logger.log('Ad state changed', {
      previous: adActive,
      next: active,
    })
    adActive = active
    if (adActive) {
      mutedByExtension = false
      pendingMuteCount = false
      pendingChannel = getChannelFromUrl()
      pendingMuteStartedAt = null
      logger.log('Ad detected', {
        channel: pendingChannel,
      })
      const didMute = await ensureMuted()
      mutedByExtension = didMute
      pendingMuteCount = didMute
      if (didMute) {
        pendingMuteStartedAt = Date.now()
      }
      logger.log('Mute attempt finished', {
        didMute,
        pendingChannel,
      })
    } else {
      logger.log('Ad cleared', {
        mutedByExtension,
        pendingMuteCount,
        pendingChannel,
      })
      if (mutedByExtension) {
        const didUnmute = await ensureUnmuted()
        logger.log('Unmute attempt finished', {
          didUnmute,
          pendingMuteCount,
          pendingChannel,
        })
        if (didUnmute && pendingMuteCount) {
          const durationMs =
            pendingMuteStartedAt !== null
              ? Date.now() - pendingMuteStartedAt
              : undefined
          logger.log('Recording muted ad stats', {
            channel: pendingChannel,
            durationMs,
          })
          await recordMutedAd(pendingChannel, durationMs)
          logger.log('Muted ad stats recording completed', {
            channel: pendingChannel,
            durationMs,
          })
        }
      }
      mutedByExtension = false
      pendingMuteCount = false
      pendingChannel = null
      pendingMuteStartedAt = null
    }
  }
}

export function startAdObserver(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return

  logger.log('Creating MutationObserver for ad detection')
  const observer = new MutationObserver(() => {
    handleAdState()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  })

  logger.log('MutationObserver attached; performing initial ad state check')
  handleAdState()
}
