/// <reference types="chrome-types" />
import { vi } from 'vitest'
import { registerPopupLogHandler, sendPopupLog } from '../src/shared/messages'

declare const __test: {
  runtimeListeners: Array<(...args: unknown[]) => unknown>
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should send popupLog payload to tab', async () => {
  const sendMessage = vi.spyOn(chrome.tabs, 'sendMessage')
  await sendPopupLog(1, 'hello', { foo: 'bar' }, 'warn')
  expect(sendMessage).toHaveBeenCalledWith(1, {
    type: 'popupLog',
    level: 'warn',
    message: 'hello',
    data: { foo: 'bar' },
  })
})

it('should route popupLog', () => {
  const onPopupLog = vi.fn()
  registerPopupLogHandler(onPopupLog)

  const listener = __test.runtimeListeners[__test.runtimeListeners.length - 1]
  listener({ type: 'popupLog', message: 'hi' }, {}, vi.fn())
  expect(onPopupLog).toHaveBeenCalled()
})
