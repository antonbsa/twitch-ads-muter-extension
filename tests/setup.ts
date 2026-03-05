/// <reference types="vitest/globals" />
import { vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Listener = (...args: unknown[]) => void

type StorageChange = { newValue?: unknown; oldValue?: unknown }
type StorageChangeMap = Record<string, StorageChange>

type ChromeMock = {
  tabs: {
    sendMessage: ReturnType<typeof vi.fn>
    query: ReturnType<typeof vi.fn>
  }
  runtime: {
    onMessage: { addListener: (fn: Listener) => void }
    getURL: (path: string) => string
  }
  i18n: {
    getMessage: (name: string, substitutions?: string | string[]) => string
    getUILanguage: () => string
  }
  storage: {
    local: {
      get: ReturnType<
        typeof vi.fn<[keys?: unknown], Promise<Record<string, unknown>>>
      >
      set: ReturnType<
        typeof vi.fn<[items: Record<string, unknown>], Promise<void>>
      >
      getBytesInUse: ReturnType<typeof vi.fn<[], Promise<number>>>
    }
    onChanged: {
      addListener: (
        fn: (changes: StorageChangeMap, areaName: string) => void,
      ) => void
    }
  }
}

const runtimeListeners: Listener[] = []
const storageListeners: Listener[] = []

const storageData: Record<string, unknown> = {}

const localeMessages = JSON.parse(
  readFileSync(join(process.cwd(), '_locales/en/messages.json'), 'utf8'),
) as Record<string, { message: string }>

const chromeMock: ChromeMock = {
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn(),
  },
  runtime: {
    onMessage: {
      addListener: (fn: Listener) => {
        runtimeListeners.push(fn)
      },
    },
    getURL: (path: string) => path,
  },
  i18n: {
    getMessage: (name: string, substitutions?: string | string[]) => {
      const message = localeMessages[name]?.message ?? ''
      if (!substitutions) return message
      const values = Array.isArray(substitutions)
        ? substitutions
        : [substitutions]
      return message.replace(/\$(\d+)/g, (_, index) => {
        const value = values[Number(index) - 1]
        return value ?? ''
      })
    },
    getUILanguage: () => 'en-US',
  },
  storage: {
    local: {
      get: vi.fn((keys?: unknown) => {
        if (!keys) return Promise.resolve({ ...storageData })
        if (typeof keys === 'string')
          return Promise.resolve({ [keys]: storageData[keys] })
        const result: Record<string, unknown> = {}
        for (const key of keys as string[]) result[key] = storageData[key]
        return Promise.resolve(result)
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(storageData, items)
        return Promise.resolve()
      }),
      getBytesInUse: vi.fn(() => Promise.resolve(0)),
    },
    onChanged: {
      addListener: (
        fn: (changes: StorageChangeMap, areaName: string) => void,
      ) => {
        storageListeners.push(fn as Listener)
      },
    },
  },
}

;(globalThis as unknown as { chrome: ChromeMock }).chrome = chromeMock
;(
  globalThis as unknown as {
    __test: {
      runtimeListeners: Listener[]
      storageListeners: Listener[]
      storageData: Record<string, unknown>
    }
  }
).__test = {
  runtimeListeners,
  storageListeners,
  storageData,
}

globalThis.Audio = class {
  volume = 1
  async play() {
    return undefined
  }
} as unknown as typeof Audio

export {}
