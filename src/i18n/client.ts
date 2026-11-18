import { createTranslator } from 'next-intl'
import { normalizeLocale } from './locale'
import { messagesForLocale } from './messages'

/** Non-React callers resolve the active document language at the time of use. */
export function clientTranslator(namespace: 'common' | 'errors' | 'csv') {
  const locale = typeof document === 'undefined' ? 'vi' : normalizeLocale(document.documentElement.lang) ?? 'vi'
  return createTranslator({ locale, messages: messagesForLocale(locale)[namespace] as Record<string, string> })
}
