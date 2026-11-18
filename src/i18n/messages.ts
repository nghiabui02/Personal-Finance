import type { AbstractIntlMessages } from 'next-intl'
import vi from '../../messages/vi.json'
import en from '../../messages/en.json'

type Messages = { [key: string]: string | Messages }

/** Missing English messages fall back per key; the coverage test still rejects them. */
export function withVietnameseFallback(fallback: Messages, selected: Messages, path = ''): Messages {
  const result: Messages = { ...selected }
  for (const [key, value] of Object.entries(fallback)) {
    const currentPath = path ? `${path}.${key}` : key
    if (result[key] === undefined) {
      console.error('[i18n] Missing message:', currentPath)
      result[key] = value
    } else if (typeof value === 'object' && typeof result[key] === 'object') {
      result[key] = withVietnameseFallback(value, result[key] as Messages, currentPath)
    }
  }
  return result
}

export function messagesForLocale(locale: string): AbstractIntlMessages {
  return locale === 'en' ? withVietnameseFallback(vi, en) : vi
}
