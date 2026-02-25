import { isAdIndicatorVisible } from './selectors'
import { ensureMuted, ensureUnmuted } from './mute'
import { recordMutedAd } from './stats'
import { getChannelFromUrl } from './live-data'
import { isMuteAdsEnabled } from './preferences'
let adActive = false
let mutedByExtension = false
let pendingMuteCount = false
let pendingChannel: string | null = null
let pendingMuteStartedAt: number | null = null

async function handleAdState(): Promise<void> {
  if (!isMuteAdsEnabled()) return
  const active = isAdIndicatorVisible()

  if (active !== adActive) {
    adActive = active
    if (adActive) {
      mutedByExtension = false
      pendingMuteCount = false
      pendingChannel = getChannelFromUrl()
      pendingMuteStartedAt = null
      const didMute = await ensureMuted()
      mutedByExtension = didMute
      pendingMuteCount = didMute
      if (didMute) {
        pendingMuteStartedAt = Date.now()
      }
    } else {
      if (mutedByExtension) {
        const didUnmute = await ensureUnmuted()
        if (didUnmute && pendingMuteCount) {
          const durationMs =
            pendingMuteStartedAt !== null
              ? Date.now() - pendingMuteStartedAt
              : undefined
          recordMutedAd(pendingChannel, durationMs)
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

  const observer = new MutationObserver(() => {
    handleAdState()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  })

  handleAdState()
}
