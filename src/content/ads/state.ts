export type AdState =
  | { phase: 'idle' }
  | { phase: 'ad' }
  | { phase: 'muted'; channel: string | null; since: number }

export type AdIntent = 'stay' | 'startMute' | 'stopAndUnmute' | 'reset'

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
