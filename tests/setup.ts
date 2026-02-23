/// <reference types="jest" />
type Listener = (...args: unknown[]) => void

type StorageChange = { newValue?: unknown; oldValue?: unknown }
type StorageChangeMap = Record<string, StorageChange>

type ChromeMock = {
  tabs: {
    sendMessage: jest.Mock<Promise<unknown>, [number, unknown] | []>
    query: jest.Mock<Promise<chrome.tabs.Tab[]>, [unknown?]>
  }
  runtime: {
    onMessage: { addListener: (fn: Listener) => void }
    getURL: (path: string) => string
  }
  storage: {
    local: {
      get: jest.Mock<Promise<Record<string, unknown>>, [unknown?]>
      set: jest.Mock<Promise<void>, [Record<string, unknown>]>
      getBytesInUse: jest.Mock<Promise<number>, [unknown?]>
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

const chromeMock: ChromeMock = {
  tabs: {
    sendMessage: jest.fn(async () => undefined),
    query: jest.fn(async () => []),
  },
  runtime: {
    onMessage: {
      addListener: (fn: Listener) => {
        runtimeListeners.push(fn)
      },
    },
    getURL: (path: string) => path,
  },
  storage: {
    local: {
      get: jest.fn(async (keys?: unknown) => {
        if (!keys) return { ...storageData }
        if (typeof keys === 'string') return { [keys]: storageData[keys] }
        const result: Record<string, unknown> = {}
        for (const key of keys as string[]) result[key] = storageData[key]
        return result
      }),
      set: jest.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items)
      }),
      getBytesInUse: jest.fn(async () => 0),
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
