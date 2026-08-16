export type AdState =
  | { phase: 'idle' }
  | { phase: 'ad' }
  | { phase: 'muted'; channel: string | null; since: number }

export type AdIntent = 'stay' | 'startMute' | 'stopAndUnmute' | 'reset'

/**
 * Decide what the next intent should be based on the current state,
 * whether an ad is detected, and whether the feature is enabled.
 * @param state The current ad state.
 * @param adDetected Whether an ad is currently detected.
 * @param enabled Whether the mute ads feature is enabled.
 * @returns The next ad intent.
 */
export function decideIntent(
  state: AdState,
  adDetected: boolean,
  enabled: boolean,
): AdIntent {
  if (!enabled) {
    return state.phase === 'idle' ? 'stay' : 'reset'
  }

  switch (state.phase) {
    case 'idle':
      return adDetected ? 'startMute' : 'stay'
    case 'ad':
      return adDetected ? 'stay' : 'reset'
    case 'muted':
      return adDetected ? 'stay' : 'stopAndUnmute'
  }
}
