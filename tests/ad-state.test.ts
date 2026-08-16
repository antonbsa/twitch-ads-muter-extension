import { decideIntent, type AdState } from '../src/content/ad-state'

const idle: AdState = { phase: 'idle' }
const ad: AdState = { phase: 'ad' }
const muted: AdState = { phase: 'muted', channel: 'hayashii', since: 1_000 }

it.each([
  { state: idle, adDetected: false, enabled: true, expected: 'stay' },
  { state: idle, adDetected: true, enabled: true, expected: 'startMute' },
  { state: ad, adDetected: true, enabled: true, expected: 'stay' },
  { state: ad, adDetected: false, enabled: true, expected: 'reset' },
  { state: muted, adDetected: true, enabled: true, expected: 'stay' },
  { state: muted, adDetected: false, enabled: true, expected: 'stopAndUnmute' },
  { state: idle, adDetected: false, enabled: false, expected: 'stay' },
  { state: ad, adDetected: true, enabled: false, expected: 'reset' },
  { state: muted, adDetected: false, enabled: false, expected: 'reset' },
])(
  'decideIntent($state.phase, adDetected=$adDetected, enabled=$enabled) -> $expected',
  ({ state, adDetected, enabled, expected }) => {
    expect(decideIntent(state, adDetected, enabled)).toBe(expected)
  },
)
