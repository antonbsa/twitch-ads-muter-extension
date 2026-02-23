import { ensureMuted, ensureUnmuted } from '../src/content/mute'

describe('mute helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  function setupSlider(value: string) {
    const slider = document.createElement('input')
    slider.setAttribute('id', 'player-volume-slider-1')
    slider.setAttribute('value', value)
    document.body.appendChild(slider)
  }

  function setupButton() {
    const button = document.createElement('button')
    button.setAttribute('data-a-target', 'player-mute-unmute-button')
    button.click = jest.fn()
    document.body.appendChild(button)
    return button
  }

  it('should click when not muted', async () => {
    setupSlider('20')
    const button = setupButton()

    const didMute = await ensureMuted()

    expect(didMute).toBe(true)
    expect(button.click).toHaveBeenCalled()
  })

  it('should do nothing when already muted', async () => {
    setupSlider('0')
    const button = setupButton()

    const didMute = await ensureMuted()

    expect(didMute).toBe(false)
    expect(button.click).not.toHaveBeenCalled()
  })

  it('should click when muted', async () => {
    setupSlider('0')
    const button = setupButton()

    await ensureUnmuted()

    expect(button.click).toHaveBeenCalled()
  })
})
