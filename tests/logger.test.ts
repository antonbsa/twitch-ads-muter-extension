import { vi } from 'vitest'
import { logger, setDebugEnabled } from '../src/utils/logger'

afterEach(() => {
  setDebugEnabled(false)
  vi.restoreAllMocks()
})

it('should not log when debug disabled', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  setDebugEnabled(false)

  logger.log('test')

  expect(logSpy).not.toHaveBeenCalled()
})

it('should log with prefix when debug enabled', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  setDebugEnabled(true)

  logger.log('hello')

  expect(logSpy).toHaveBeenCalledWith('[Twitch ads muter]', 'hello')
})
