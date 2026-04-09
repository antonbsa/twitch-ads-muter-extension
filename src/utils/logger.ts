let debugEnabled = false
const pendingLogs: Array<{
  level: 'log' | 'warn' | 'error'
  args: unknown[]
}> = []
const MAX_PENDING_LOGS = 100

function emit(level: 'log' | 'warn' | 'error', args: unknown[]): void {
  console[level](prefix, ...args)
}

function queue(level: 'log' | 'warn' | 'error', args: unknown[]): void {
  if (pendingLogs.length >= MAX_PENDING_LOGS) {
    pendingLogs.shift()
  }
  pendingLogs.push({ level, args })
}

export function setDebugEnabled(value: boolean): void {
  const shouldFlush = !debugEnabled && value
  debugEnabled = value

  if (shouldFlush) {
    emit('log', ['Debug logging enabled'])
    for (const entry of pendingLogs) {
      emit(entry.level, entry.args)
    }
    pendingLogs.length = 0
  }
}

const prefix = '[Twitch ads muter]'

export const logger = {
  log(...args: unknown[]): void {
    if (!debugEnabled) {
      queue('log', args)
      return
    }
    emit('log', args)
  },
  warn(...args: unknown[]): void {
    if (!debugEnabled) {
      queue('warn', args)
    }
    emit('warn', args)
  },
  error(...args: unknown[]): void {
    if (!debugEnabled) {
      queue('error', args)
    }
    emit('error', args)
  },
}
