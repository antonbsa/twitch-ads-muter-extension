export const supportedLocales = ['en', 'pt_BR'] as const
export type SupportedLocale = (typeof supportedLocales)[number]

type LocaleMessages = Record<string, { message: string }>

type LocaleController = {
  t: (key: string, substitutions?: string | string[]) => string
  initI18n: () => void
  setLocale: (locale: string, persist: boolean) => Promise<void>
  loadLocalePreference: () => Promise<void>
  getCurrentLocale: () => SupportedLocale
  getNextLocale: () => SupportedLocale
  getLocaleDisplayName: (locale?: SupportedLocale) => string
}

const localeCache = new Map<SupportedLocale, LocaleMessages>()

function normalizeLocale(value: string | null | undefined): SupportedLocale {
  if (!value) return 'en'
  const normalized = value.replace('-', '_')
  const lower = normalized.toLowerCase()
  if (lower.startsWith('pt')) return 'pt_BR'
  if (lower.startsWith('en')) return 'en'
  if (supportedLocales.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale
  }
  return 'en'
}

async function loadLocaleMessages(
  locale: SupportedLocale,
): Promise<LocaleMessages> {
  const cached = localeCache.get(locale)
  if (cached) return cached
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to load locale ${locale}`)
    const json = (await response.json()) as LocaleMessages
    localeCache.set(locale, json)
    return json
  } catch {
    const fallback: LocaleMessages = {}
    localeCache.set(locale, fallback)
    return fallback
  }
}

function formatMessage(
  message: string,
  substitutions?: string | string[],
): string {
  if (!substitutions) return message
  const values = Array.isArray(substitutions) ? substitutions : [substitutions]
  return message.replace(/\$(\d+)/g, (_, index) => {
    const value = values[Number(index) - 1]
    return value ?? ''
  })
}

export function createLocaleController(storageKey: string): LocaleController {
  let currentLocale: SupportedLocale = 'en'
  let currentMessages: LocaleMessages | null = null

  function t(key: string, substitutions?: string | string[]): string {
    if (currentMessages?.[key]?.message) {
      return formatMessage(currentMessages[key].message, substitutions)
    }
    const message = chrome.i18n.getMessage(key, substitutions)
    return message || key
  }

  function initI18n(): void {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n
      if (!key) return
      const message = t(key)
      if (!message) return
      const attr = el.dataset.i18nAttr
      if (attr) {
        attr
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((name) => {
            el.setAttribute(name, message)
          })
      } else {
        el.textContent = message
      }
    })
  }

  function getLocaleDisplayName(
    locale: SupportedLocale = currentLocale,
  ): string {
    return t(locale === 'pt_BR' ? 'languageNamePtBR' : 'languageNameEn')
  }

  function getNextLocale(): SupportedLocale {
    const index = supportedLocales.indexOf(currentLocale)
    const nextIndex = (index + 1) % supportedLocales.length
    return supportedLocales[nextIndex]
  }

  async function setLocale(locale: string, persist: boolean): Promise<void> {
    const normalized = normalizeLocale(locale)
    currentLocale = normalized
    currentMessages = await loadLocaleMessages(normalized)
    if (persist) {
      chrome.storage.local.set({ [storageKey]: normalized })
    }
  }

  async function loadLocalePreference(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(storageKey)
      const value = stored[storageKey]
      if (typeof value === 'string') {
        await setLocale(value, false)
        return
      }
    } catch {
      // Ignore storage errors; fall back to UI language.
    }

    await setLocale(chrome.i18n.getUILanguage(), false)
  }

  function getCurrentLocale(): SupportedLocale {
    return currentLocale
  }

  return {
    t,
    initI18n,
    setLocale,
    loadLocalePreference,
    getCurrentLocale,
    getNextLocale,
    getLocaleDisplayName,
  }
}
