import { ensureMuted, ensureUnmuted } from '../mute'
import { recordMutedAd } from './stats'
import { getChannelFromUrl } from '../live-data'
import { logger } from '../../utils/logger'
import type { AdIntent, AdState } from './state'

/**
 * Executes the side effect for the given intent and returns the next state.
 * @param intent The intent to execute.
 * @param current The current ad state.
 * @returns The resulting ad state.
 */
export async function applyIntent(
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
  logger.log('Unmute attempt finished', {
    didUnmute,
    channel: current.channel,
  })
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
