import { logger, setDebugEnabled } from '../src/utils/logger'

describe('logger', () => {
  afterEach(() => {
    setDebugEnabled(false)
    jest.restoreAllMocks()
  })

  it('should not log when debug disabled', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    setDebugEnabled(false)

    logger.log('test')

    expect(logSpy).not.toHaveBeenCalled()
  })

  it('should log with prefix when debug enabled', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    setDebugEnabled(true)

    logger.log('hello')

    expect(logSpy).toHaveBeenCalledWith('[Twitch ads muter]', 'hello')
  })
})
