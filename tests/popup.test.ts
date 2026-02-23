/// <reference types="chrome-types" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  AD_MUTE_ENABLED_KEY,
  AD_MUTE_STATS_KEY,
  AUDIO_NOTIFICATION_KEY,
} from '../src/types'

declare const __test: {
  storageData: Record<string, unknown>
}

function loadPopupHtml(): void {
  const html = readFileSync(join(process.cwd(), 'src/popup/index.html'), 'utf8')
  document.documentElement.innerHTML = html
}

async function flushAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('popup', () => {
  beforeEach(() => {
    for (const key of Object.keys(__test.storageData)) {
      delete __test.storageData[key]
    }
    jest.clearAllMocks()
    loadPopupHtml()
  })

  it('should render default stats placeholders and toggles', () => {
    const channel = document.getElementById('channel')
    const mutedToday = document.getElementById('mutedToday')
    const mutedTotal = document.getElementById('mutedTotal')
    const muteToggle = document.getElementById('muteToggle')
    const notifyToggle = document.getElementById('notifyToggle')

    expect(channel).not.toBeNull()
    expect(mutedToday).not.toBeNull()
    expect(mutedTotal).not.toBeNull()
    expect(muteToggle).not.toBeNull()
    expect(notifyToggle).not.toBeNull()

    const mutedTodayValue = mutedToday?.querySelector('span')?.textContent
    const mutedTotalValue = mutedTotal?.querySelector('span')?.textContent
    expect(mutedTodayValue).toBe('-')
    expect(mutedTotalValue).toBe('-')
  })

  it('should render stats from storage when channel data exists', async () => {
    const now = Date.now()
    __test.storageData[AD_MUTE_STATS_KEY] = {
      version: 2,
      allTimeTotal: 2,
      channels: [
        {
          channel: 'hayashii',
          allTimeCount: 2,
          log: [now],
        },
      ],
    }

    jest
      .spyOn(chrome.tabs, 'query')
      .mockImplementationOnce(async () => [
        { id: 1, url: 'https://www.twitch.tv/hayashii' } as chrome.tabs.Tab,
      ])

    jest.spyOn(chrome.tabs, 'sendMessage').mockImplementationOnce(async () => ({
      ok: true,
      data: {
        channel: 'hayashii',
        viewersText: null,
        viewers: null,
        liveTime: null,
        url: 'https://www.twitch.tv/hayashii',
        timestamp: new Date().toISOString(),
      },
      stats: __test.storageData[AD_MUTE_STATS_KEY],
    }))

    await jest.isolateModulesAsync(async () => {
      await import('../src/popup/index')
    })

    await flushAsync()
    await flushAsync()

    const mutedToday = document.querySelector('#mutedToday span')?.textContent
    const mutedTotal = document.querySelector('#mutedTotal span')?.textContent

    expect(mutedToday).toBe('1')
    expect(mutedTotal).toBe('2')
  })

  it('should set stats to 0 when channel has no stored data', async () => {
    __test.storageData[AD_MUTE_STATS_KEY] = {
      version: 2,
      allTimeTotal: 0,
      channels: [],
    }

    jest
      .spyOn(chrome.tabs, 'query')
      .mockImplementationOnce(async () => [
        { id: 1, url: 'https://www.twitch.tv/hayashii' } as chrome.tabs.Tab,
      ])

    jest.spyOn(chrome.tabs, 'sendMessage').mockImplementationOnce(async () => ({
      ok: true,
      data: {
        channel: 'hayashii',
        viewersText: null,
        viewers: null,
        liveTime: null,
        url: 'https://www.twitch.tv/hayashii',
        timestamp: new Date().toISOString(),
      },
      stats: __test.storageData[AD_MUTE_STATS_KEY],
    }))

    await jest.isolateModulesAsync(async () => {
      await import('../src/popup/index')
    })

    await flushAsync()
    await flushAsync()

    const mutedToday = document.querySelector('#mutedToday span')?.textContent
    const mutedTotal = document.querySelector('#mutedTotal span')?.textContent

    expect(mutedToday).toBe('0')
    expect(mutedTotal).toBe('0')
  })

  it('should disable audio toggle when mute ads is off', async () => {
    jest
      .spyOn(chrome.tabs, 'query')
      .mockImplementationOnce(async () => [
        { id: 1, url: 'https://www.twitch.tv/hayashii' } as chrome.tabs.Tab,
      ])

    jest.spyOn(chrome.tabs, 'sendMessage').mockImplementationOnce(async () => ({
      ok: true,
      data: {
        channel: 'hayashii',
        viewersText: null,
        viewers: null,
        liveTime: null,
        url: 'https://www.twitch.tv/hayashii',
        timestamp: new Date().toISOString(),
      },
    }))

    await jest.isolateModulesAsync(async () => {
      await import('../src/popup/index')
    })

    await flushAsync()

    const muteToggle = document.getElementById(
      'muteToggle',
    ) as HTMLButtonElement
    const notifyToggle = document.getElementById(
      'notifyToggle',
    ) as HTMLButtonElement
    const setSpy = jest.spyOn(chrome.storage.local, 'set')

    muteToggle.click()

    expect(notifyToggle.classList.contains('is-disabled')).toBe(true)
    expect(notifyToggle.getAttribute('aria-disabled')).toBe('true')
    expect(setSpy).toHaveBeenCalledWith({ [AD_MUTE_ENABLED_KEY]: false })

    notifyToggle.click()
    expect(setSpy).not.toHaveBeenCalledWith({
      [AUDIO_NOTIFICATION_KEY]: expect.any(Boolean),
    })
  })

  it('should update storage when toggles are clicked', async () => {
    jest
      .spyOn(chrome.tabs, 'query')
      .mockImplementationOnce(async () => [
        { id: 1, url: 'https://www.twitch.tv/hayashii' } as chrome.tabs.Tab,
      ])

    jest.spyOn(chrome.tabs, 'sendMessage').mockImplementationOnce(async () => ({
      ok: true,
      data: {
        channel: 'hayashii',
        viewersText: null,
        viewers: null,
        liveTime: null,
        url: 'https://www.twitch.tv/hayashii',
        timestamp: new Date().toISOString(),
      },
    }))

    const setSpy = jest.spyOn(chrome.storage.local, 'set')

    await jest.isolateModulesAsync(async () => {
      await import('../src/popup/index')
    })

    await flushAsync()

    const muteToggle = document.getElementById(
      'muteToggle',
    ) as HTMLButtonElement
    const notifyToggle = document.getElementById(
      'notifyToggle',
    ) as HTMLButtonElement

    muteToggle.click()
    expect(setSpy).toHaveBeenCalledWith({ [AD_MUTE_ENABLED_KEY]: false })

    muteToggle.click()
    expect(setSpy).toHaveBeenCalledWith({ [AD_MUTE_ENABLED_KEY]: true })

    notifyToggle.click()
    expect(setSpy).toHaveBeenCalledWith({
      [AUDIO_NOTIFICATION_KEY]: expect.any(Boolean),
    })
  })
})
