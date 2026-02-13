let debugEnabled = false

export function setDebugEnabled(value: boolean): void {
  debugEnabled = value
}

const prefix = '[Twitch ads muter]'

export const logger = {
  log(...args: unknown[]): void {
    if (!debugEnabled) return
    console.log(prefix, ...args)
  },
  warn(...args: unknown[]): void {
    if (!debugEnabled) return
    console.warn(prefix, ...args)
  },
  error(...args: unknown[]): void {
    if (!debugEnabled) return
    console.error(prefix, ...args)
  },
}
