import vi from '../../messages/vi.json' with { type: 'json' }
import en from '../../messages/en.json' with { type: 'json' }

type CategoryLabel = {
  name: string
  default_key?: string | null
  system_key?: string | null
  name_is_custom?: boolean
}

/** Unkeyed and customized categories always retain the name their owner chose. */
export function getCategoryName(category: CategoryLabel, locale: string): string {
  if (category.name_is_custom !== false) return category.name
  const key = category.default_key ?? category.system_key
  const labels: Record<string, string> = (locale === 'en' ? en : vi).categories.labels
  return key && labels[key] ? labels[key] : category.name
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

export function categorySearchTerms(category: CategoryLabel): string {
  return [category.name, getCategoryName(category, 'vi'), getCategoryName(category, 'en')].join(' ')
}

export function sortCategories<T extends CategoryLabel & { is_default?: boolean }>(categories: T[], locale: string): T[] {
  return [...categories].sort((a, b) => Number(b.is_default ?? false) - Number(a.is_default ?? false)
    || getCategoryName(a, locale).localeCompare(getCategoryName(b, locale), locale))
}
