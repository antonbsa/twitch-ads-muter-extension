import { isAdIndicatorVisible } from './selectors'
import { ensureMuted, ensureUnmuted } from './mute'
import { recordMutedAd } from './stats'
import { getChannelFromUrl } from './live-data'

let adActive = false
let mutedByExtension = false

async function handleAdState(): Promise<void> {
  const active = isAdIndicatorVisible()

  if (active !== adActive) {
    adActive = active
    if (adActive) {
      mutedByExtension = false
      const didMute = await ensureMuted()
      mutedByExtension = didMute
      if (didMute) {
        recordMutedAd(getChannelFromUrl())
      }
    } else {
      if (mutedByExtension) {
        await ensureUnmuted()
      }
      mutedByExtension = false
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
