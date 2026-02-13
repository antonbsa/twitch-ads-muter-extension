let debugEnabled = false

export function setDebugEnabled(value: boolean): void {
  debugEnabled = value
}

export const logger = {
  log(...args: unknown[]): void {
    if (!debugEnabled) return
    console.log(...args)
  },
  warn(...args: unknown[]): void {
    if (!debugEnabled) return
    console.warn(...args)
  },
  error(...args: unknown[]): void {
    if (!debugEnabled) return
    console.error(...args)
  },
}
