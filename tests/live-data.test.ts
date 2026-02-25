import {
  collectLiveData,
  getChannelFromUrl,
  hasAnyLiveField,
} from '../src/content/live-data'

beforeEach(() => {
  document.body.innerHTML = ''
  window.history.pushState({}, '', '/')
})

it('should extract channel', () => {
  window.history.pushState({}, '', '/hayashii')
  expect(getChannelFromUrl()).toBe('hayashii')

  window.history.pushState({}, '', '/hayashii/')
  expect(getChannelFromUrl()).toBe('hayashii')

  window.history.pushState({}, '', '/hayashii/videos')
  expect(getChannelFromUrl()).toBe('hayashii')
})

it('should read DOM and return structure', () => {
  window.history.pushState({}, '', '/hayashii')

  const viewers = document.createElement('strong')
  viewers.setAttribute('data-a-target', 'animated-channel-viewers-count')
  viewers.textContent = '1,234'
  document.body.appendChild(viewers)

  const liveTime = document.createElement('span')
  liveTime.className = 'live-time'
  const inner = document.createElement('span')
  inner.textContent = '0:10:00'
  liveTime.appendChild(inner)
  document.body.appendChild(liveTime)

  const data = collectLiveData()
  expect(data.channel).toBe('hayashii')
  expect(data.viewersText).toBe('1,234')
  expect(data.viewers).toBe(1234)
  expect(data.liveTime).toBe('0:10:00')
  expect(typeof data.timestamp).toBe('string')
})

it('should detect data', () => {
  expect(hasAnyLiveField(null)).toBe(false)
  expect(
    hasAnyLiveField({
      channel: null,
      viewersText: null,
      viewers: null,
      liveTime: null,
      url: '',
      timestamp: '',
    }),
  ).toBe(false)

  expect(
    hasAnyLiveField({
      channel: null,
      viewersText: '100',
      viewers: 100,
      liveTime: null,
      url: '',
      timestamp: '',
    }),
  ).toBe(true)
})
