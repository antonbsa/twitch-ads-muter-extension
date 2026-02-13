export const SELECTORS = {
  // These selectors are best-effort guesses and may need updates.
  viewers: 'strong[data-a-target="animated-channel-viewers-count"]',
  liveTime: 'span.live-time span',
  adIndicator: '[aria-label="Ad"]',
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

export function isAdIndicatorVisible(): boolean {
  return Boolean(document.querySelector(SELECTORS.adIndicator))
}

export function hasLiveDataElements(): boolean {
  return Boolean(
    document.querySelector(SELECTORS.viewers) ||
      document.querySelector(SELECTORS.liveTime),
  )
}
