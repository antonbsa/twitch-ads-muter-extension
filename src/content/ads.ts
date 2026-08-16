import { isAnyAdIndicatorPresent } from './selectors'
import { ensureMuted, ensureUnmuted } from './mute'
import { recordMutedAd } from './stats'
import { getChannelFromUrl } from './live-data'
import { isMuteAdsEnabled } from './preferences'
import { logger } from '../utils/logger'
import { decideIntent, type AdIntent, type AdState } from './ad-state'

const MUTATION_THROTTLE_MS = 250

let state: AdState = { phase: 'idle' }
let queue: Promise<void> = Promise.resolve()
let throttleTimer: ReturnType<typeof setTimeout> | null = null

async function startMute(): Promise<AdState> {
  const channel = getChannelFromUrl()
  logger.log('Ad detected', { channel })
  const didMute = await ensureMuted()
  logger.log('Mute attempt finished', { didMute, channel })
  return didMute
    ? { phase: 'muted', channel, since: Date.now() }
    : { phase: 'ad' }
}

async function stopAndUnmute(
  current: Extract<AdState, { phase: 'muted' }>,
): Promise<AdState> {
  const didUnmute = await ensureUnmuted()
  logger.log('Unmute attempt finished', { didUnmute, channel: current.channel })
  if (didUnmute) {
    const durationMs = Date.now() - current.since
    await recordMutedAd(current.channel, durationMs)
    logger.log('Muted ad stats recorded', {
      channel: current.channel,
      durationMs,
    })
  }
  return { phase: 'idle' }
}

async function applyIntent(
  intent: AdIntent,
  current: AdState,
): Promise<AdState> {
  switch (intent) {
    case 'stay':
      return current
    case 'reset':
      return { phase: 'idle' }
    case 'startMute':
      return startMute()
    case 'stopAndUnmute':
      if (current.phase !== 'muted') {
        throw new Error(
          `stopAndUnmute intent requires muted phase, got ${current.phase}`,
        )
      }
      return stopAndUnmute(current)
  }
}

async function tick(): Promise<void> {
  const enabled = isMuteAdsEnabled()
  const adDetected = enabled && isAnyAdIndicatorPresent()
  const intent = decideIntent(state, adDetected, enabled)

  if (intent === 'stay') return

  logger.log('Ad state transition', {
    from: state,
    adDetected,
    enabled,
    intent,
  })
  try {
    state = await applyIntent(intent, state)
  } catch (error) {
    logger.error('Ad state tick failed', { state, intent, error })
  }
}

function scheduleTick(): void {
  queue = queue.then(tick)
}

function onMutation(): void {
  if (throttleTimer) return
  throttleTimer = setTimeout(() => {
    throttleTimer = null
    scheduleTick()
  }, MUTATION_THROTTLE_MS)
}

export function startAdObserver(): void {
  if (!window.location.hostname.endsWith('twitch.tv')) return

  logger.log('Creating MutationObserver for ad detection')
  const observer = new MutationObserver(() => {
    onMutation()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  })

  logger.log('MutationObserver attached; performing initial ad state check')
  scheduleTick()
}
