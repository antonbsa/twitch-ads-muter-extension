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

it('should print warnings even when debug is disabled', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  logger.warn('problem')

  expect(warnSpy).toHaveBeenCalledWith('[Twitch ads muter]', 'problem')
})

it('should flush buffered logs when debug becomes enabled', () => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

  logger.log('before debug')
  setDebugEnabled(true)

  expect(logSpy).toHaveBeenNthCalledWith(
    1,
    '[Twitch ads muter]',
    'Debug logging enabled',
  )
  expect(logSpy).toHaveBeenNthCalledWith(
    2,
    '[Twitch ads muter]',
    'before debug',
  )
})
