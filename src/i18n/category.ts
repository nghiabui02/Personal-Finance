import vi from '../../messages/vi.json' with { type: 'json' }
import en from '../../messages/en.json' with { type: 'json' }
import catalog from '@/lib/category-catalog.json'

type CategoryLabel = {
  name?: string | null
  template?: { default_key: string } | null
  default_key?: string | null
  system_key?: string | null
}

/** Unkeyed and customized categories always retain the name their owner chose. */
export function getCategoryName(category: CategoryLabel, locale: string): string {
  if (category.name !== null && category.name !== undefined) return category.name
  const key = category.template?.default_key ?? category.default_key ?? category.system_key
  const template = catalog.templates.find(item => item.key === key)
  if (template) return locale === 'en' ? template.en : template.vi
  const labels: Record<string, string> = (locale === 'en' ? en : vi).categories.labels
  return key && labels[key] ? labels[key] : ''
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

export function categorySearchTerms(category: CategoryLabel): string {
  const key = category.template?.default_key ?? category.default_key
  const aliases = catalog.templates.find(item => item.key === key)?.aliases ?? []
  return [category.name, getCategoryName(category, 'vi'), getCategoryName(category, 'en'), ...aliases].join(' ')
}

export function sortCategories<T extends CategoryLabel>(categories: T[], locale: string): T[] {
  return [...categories].sort((a, b) => getCategoryName(a, locale).localeCompare(getCategoryName(b, locale), locale))
}
