import { playSound } from './audio'
import { getMuteButton, getVolumeSliderValue } from './selectors'
import { logger } from '../utils/logger'

function getIsMuted(): boolean | null {
  const sliderValue = getVolumeSliderValue()
  if (sliderValue == null) return null
  return sliderValue === 0
}

export async function ensureMuted(): Promise<boolean> {
  const button = getMuteButton()
  if (!button) {
    logger.warn('Mute button not found')
    return false
  }
  const isMuted = getIsMuted()
  logger.log('ensureMuted state', { isMuted })
  if (isMuted === true) {
    logger.log('Skipping mute because player is already muted')
    return false
  }

  playSound('mute')
  logger.log('Clicking mute button')
  button.click()
  return true
}

export async function ensureUnmuted(): Promise<boolean> {
  const button = getMuteButton()
  if (!button) {
    logger.warn('Mute button not found while trying to unmute')
    return false
  }
  const isMuted = getIsMuted()
  logger.log('ensureUnmuted state', { isMuted })
  if (isMuted === false) {
    logger.log('Skipping unmute because player is already unmuted')
    return false
  }

  playSound('unmute')
  logger.log('Clicking unmute button')
  button.click()
  return true
}
