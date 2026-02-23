/// <reference types="chrome-types" />
import {
  registerMessageHandlers,
  requestLiveData,
  sendPopupLog,
} from '../src/shared/messages'

declare const __test: {
  runtimeListeners: Array<(...args: unknown[]) => unknown>
}

describe('shared messages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should send popupLog payload to tab', async () => {
    const sendMessage = jest.spyOn(chrome.tabs, 'sendMessage')
    await sendPopupLog(1, 'hello', { foo: 'bar' }, 'warn')
    expect(sendMessage).toHaveBeenCalledWith(1, {
      type: 'popupLog',
      level: 'warn',
      message: 'hello',
      data: { foo: 'bar' },
    })
  })

  it('should send getData request', async () => {
    const responseMock = {
      ok: true,
      data: {
        channel: null,
        viewersText: null,
        viewers: null,
        liveTime: null,
        url: '',
        timestamp: '',
      },
    }
    const sendMessage = jest
      .spyOn(chrome.tabs, 'sendMessage')
      .mockImplementationOnce(async () => responseMock)
    const response = await requestLiveData(2, { wait: true })
    expect(sendMessage).toHaveBeenCalled()
    expect(response).toEqual(responseMock)
  })

  it('should route popupLog and getData', async () => {
    const onPopupLog = jest.fn()
    const onGetData = jest.fn(async () => ({
      ok: true,
      data: {
        channel: null,
        viewersText: null,
        viewers: null,
        liveTime: null,
        url: '',
        timestamp: '',
      },
    }))
    registerMessageHandlers({ onPopupLog, onGetData })

    const listener = __test.runtimeListeners[__test.runtimeListeners.length - 1]
    listener({ type: 'popupLog', message: 'hi' }, {}, jest.fn())
    expect(onPopupLog).toHaveBeenCalled()

    const sendResponse = jest.fn()
    const returnValue = listener({ type: 'getData' }, {}, sendResponse)
    expect(returnValue).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      data: {
        channel: null,
        viewersText: null,
        viewers: null,
        liveTime: null,
        url: '',
        timestamp: '',
      },
    })
  })
})
