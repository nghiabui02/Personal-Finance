/** Locale selection is independent of ledger dates and VND number formatting. */
export const LOCALES = ['vi', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'vi'
export const LOCALE_COOKIE = 'finance_locale'
export const LOCALE_COOKIE_OPTIONS = {
  httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
} as const

export function normalizeLocale(value: unknown): Locale | undefined {
  if (typeof value !== 'string') return undefined
  const language = value.toLowerCase().split('-')[0]
  return LOCALES.find(locale => locale === language)
}

export function preferredLanguage(header: string | null): Locale | undefined {
  return (header ?? '').split(',').map((entry, index) => {
    const [tag, ...parameters] = entry.trim().split(';')
    const quality = parameters.find(parameter => parameter.trim().startsWith('q='))?.trim().slice(2)
    const valid = quality === undefined || /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(quality)
    return { locale: normalizeLocale(tag), quality: valid ? Number(quality ?? 1) : 0, index }
  }).filter(entry => entry.locale && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index)[0]?.locale
}

export function resolveLocale(account: unknown, cookie: unknown, acceptLanguage: string | null): Locale {
  return normalizeLocale(account) ?? normalizeLocale(cookie) ?? preferredLanguage(acceptLanguage) ?? DEFAULT_LOCALE
}
