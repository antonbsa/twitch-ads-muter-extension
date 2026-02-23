import { logger, setDebugEnabled } from '../src/utils/logger'

describe('logger', () => {
  afterEach(() => {
    setDebugEnabled(false)
    jest.restoreAllMocks()
  })

  it('does not log when debug disabled', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    setDebugEnabled(false)

    logger.log('test')

    expect(logSpy).not.toHaveBeenCalled()
  })

  it('logs with prefix when debug enabled', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    setDebugEnabled(true)

    logger.log('hello')

    expect(logSpy).toHaveBeenCalledWith('[Twitch ads muter]', 'hello')
  })
})
