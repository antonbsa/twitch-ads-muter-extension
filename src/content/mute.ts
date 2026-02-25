import { playSound } from './audio'
import { getMuteButton, getVolumeSliderValue } from './selectors'

function getIsMuted(): boolean | null {
  const sliderValue = getVolumeSliderValue()
  if (sliderValue == null) return null
  return sliderValue === 0
}

export async function ensureMuted(): Promise<boolean> {
  const button = getMuteButton()
  if (!button) return false
  const isMuted = getIsMuted()
  if (isMuted === true) return false

  playSound('mute')
  button.click()
  return true
}

export async function ensureUnmuted(): Promise<boolean> {
  const button = getMuteButton()
  if (!button) return false
  const isMuted = getIsMuted()
  if (isMuted === false) return false

  playSound('unmute')
  button.click()
  return true
}
