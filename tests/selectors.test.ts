import {
  getMuteButton,
  getVolumeSliderValue,
  isAnyAdIndicatorPresent,
} from '../src/content/selectors'
import { logger } from '../src/utils/logger'
import { vi } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ''
})

it('should find mute button', () => {
  const button = document.createElement('button')
  button.setAttribute('data-a-target', 'player-mute-unmute-button')
  document.body.appendChild(button)

  expect(getMuteButton()).toBe(button)
})

it('should read volume slider value from value/aria/data', () => {
  const slider = document.createElement('input')
  slider.setAttribute('id', 'player-volume-slider-1')
  slider.setAttribute('value', '42')
  document.body.appendChild(slider)

  expect(getVolumeSliderValue()).toBe(42)

  slider.removeAttribute('value')
  slider.setAttribute('aria-valuenow', '7')
  expect(getVolumeSliderValue()).toBe(7)

  slider.removeAttribute('aria-valuenow')
  slider.setAttribute('data-value', '3')
  expect(getVolumeSliderValue()).toBe(3)
})

it('should detect ad indicator', () => {
  const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  expect(isAnyAdIndicatorPresent()).toBe(false)

  const ad = document.createElement('span')
  ad.setAttribute('data-a-target', 'video-ad-label')
  document.body.appendChild(ad)
  expect(isAnyAdIndicatorPresent()).toBe(true)
  expect(warnSpy).toHaveBeenCalledWith('Primary ad selector health degraded', {
    primarySelectorMatches: [
      {
        selector: 'span[data-a-target="video-ad-label"]',
        matched: false,
      },
      {
        selector: 'span[data-a-target="video-ad-countdown"]',
        matched: false,
      },
    ],
    fallbackSelector: 'div[data-a-target="video-ref"] button[aria-label*="Ad"]',
    fallbackMatched: false,
  })
})

it('should use the button fallback only when nested text is Ad', () => {
  const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  const button = document.createElement('button')
  button.setAttribute('aria-label', 'Ad information')
  const videoRef = document.createElement('div')
  videoRef.setAttribute('data-a-target', 'video-ref')
  const wrapper = document.createElement('div')
  const label = document.createElement('p')
  label.textContent = 'Ad'
  wrapper.appendChild(label)
  button.appendChild(wrapper)
  videoRef.appendChild(button)
  document.body.appendChild(videoRef)

  expect(isAnyAdIndicatorPresent()).toBe(true)
  expect(warnSpy).toHaveBeenCalledWith('Primary ad selector health degraded', {
    primarySelectorMatches: [
      {
        selector: 'span[data-a-target="video-ad-label"]',
        matched: false,
      },
      {
        selector: 'span[data-a-target="video-ad-countdown"]',
        matched: false,
      },
    ],
    fallbackSelector: 'div[data-a-target="video-ref"] button[aria-label*="Ad"]',
    fallbackMatched: true,
  })
})

it('should ignore the button fallback when nested text is not Ad', () => {
  const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  const button = document.createElement('button')
  button.setAttribute('aria-label', 'Ad information')
  const videoRef = document.createElement('div')
  videoRef.setAttribute('data-a-target', 'video-ref')
  const wrapper = document.createElement('div')
  const label = document.createElement('p')
  label.textContent = 'Not an ad'
  wrapper.appendChild(label)
  button.appendChild(wrapper)
  videoRef.appendChild(button)
  document.body.appendChild(videoRef)

  expect(isAnyAdIndicatorPresent()).toBe(false)
  expect(warnSpy).toHaveBeenCalledWith('Primary ad selector health degraded', {
    primarySelectorMatches: [
      {
        selector: 'span[data-a-target="video-ad-label"]',
        matched: false,
      },
      {
        selector: 'span[data-a-target="video-ad-countdown"]',
        matched: false,
      },
    ],
    fallbackSelector: 'div[data-a-target="video-ref"] button[aria-label*="Ad"]',
    fallbackMatched: false,
  })
})

it('should warn when one primary selector is missing even if another one matches', () => {
  const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  const ad = document.createElement('span')
  ad.setAttribute('data-a-target', 'video-ad-label')
  document.body.appendChild(ad)

  expect(isAnyAdIndicatorPresent()).toBe(true)
  expect(warnSpy).toHaveBeenCalledWith('Primary ad selector health degraded', {
    primarySelectorMatches: [
      {
        selector: 'span[data-a-target="video-ad-label"]',
        matched: true,
      },
      {
        selector: 'span[data-a-target="video-ad-countdown"]',
        matched: false,
      },
    ],
    fallbackSelector: 'div[data-a-target="video-ref"] button[aria-label*="Ad"]',
    fallbackMatched: false,
  })
})
