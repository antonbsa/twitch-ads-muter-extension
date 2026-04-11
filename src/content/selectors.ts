import { logger } from '../utils/logger'

const videoRefSelector = 'div[data-a-target="video-ref"]'
let lastPrimarySelectorWarningSignature: string | null = null

export const SELECTORS = {
  adIndicators: [
    'span[data-a-target="video-ad-label"]',
    'span[data-a-target="video-ad-countdown"]',
  ],
  adIndicatorFallbackButton: `${videoRefSelector} button[aria-label*="Ad"]`,
  muteButton: 'button[data-a-target="player-mute-unmute-button"]',
  sliderVolume: 'input[id^="player-volume-slider"]',
}

export function getMuteButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(SELECTORS.muteButton)
}

export function getVolumeSliderValue(): number | null {
  const slider = document.querySelector<HTMLElement>(SELECTORS.sliderVolume)
  if (!slider) return null

  const raw =
    slider.getAttribute('value') ??
    slider.getAttribute('aria-valuenow') ??
    slider.getAttribute('data-value')
  if (raw == null) return null

  const value = Number(raw)
  if (Number.isNaN(value)) return null
  return value
}

export function isAnyAdIndicatorPresent(): boolean {
  const primarySelectorMatches = SELECTORS.adIndicators.map((selector) => ({
    selector,
    matched: document.querySelector(selector) !== null,
  }))
  const hasKnownAdIndicator = primarySelectorMatches.some(
    ({ matched }) => matched,
  )

  const fallbackButton = document.querySelector<HTMLButtonElement>(
    SELECTORS.adIndicatorFallbackButton,
  )
  const label = fallbackButton?.querySelector('div > p')?.textContent?.trim()
  const fallbackMatched = label === 'Ad'

  const missingPrimarySelectors = primarySelectorMatches.filter(
    ({ matched }) => !matched,
  )
  if (missingPrimarySelectors.length === 0) {
    lastPrimarySelectorWarningSignature = null
  } else {
    const warningSignature = JSON.stringify({
      primarySelectorMatches,
      fallbackMatched,
    })
    if (warningSignature !== lastPrimarySelectorWarningSignature) {
      lastPrimarySelectorWarningSignature = warningSignature
      logger.warn('Primary ad selector health degraded', {
        primarySelectorMatches,
        fallbackSelector: SELECTORS.adIndicatorFallbackButton,
        fallbackMatched,
      })
    }
  }

  return hasKnownAdIndicator || fallbackMatched
}
