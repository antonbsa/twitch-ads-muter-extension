import {
  getMuteButton,
  getVolumeSliderValue,
  hasLiveDataElements,
  isAdIndicatorVisible,
} from '../src/content/selectors'

describe('selectors', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('finds mute button', () => {
    const button = document.createElement('button')
    button.setAttribute('data-a-target', 'player-mute-unmute-button')
    document.body.appendChild(button)

    expect(getMuteButton()).toBe(button)
  })

  it('reads volume slider value from value/aria/data', () => {
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

  it('detects ad indicator and live data elements', () => {
    expect(isAdIndicatorVisible()).toBe(false)
    expect(hasLiveDataElements()).toBe(false)

    const ad = document.createElement('div')
    ad.setAttribute('aria-label', 'Ad')
    document.body.appendChild(ad)
    expect(isAdIndicatorVisible()).toBe(true)

    const viewers = document.createElement('strong')
    viewers.setAttribute('data-a-target', 'animated-channel-viewers-count')
    document.body.appendChild(viewers)
    expect(hasLiveDataElements()).toBe(true)
  })
})
