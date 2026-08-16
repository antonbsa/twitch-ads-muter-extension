import { isAnyAdIndicatorPresent } from '../selectors'
import { isMuteAdsEnabled } from '../preferences'
import { logger } from '../../utils/logger'
import { decideIntent, type AdState } from './state'
import { applyIntent } from './effects'

const MUTATION_THROTTLE_MS = 250

let state: AdState = { phase: 'idle' }
let queue: Promise<void> = Promise.resolve()
let throttleTimer: ReturnType<typeof setTimeout> | null = null

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
