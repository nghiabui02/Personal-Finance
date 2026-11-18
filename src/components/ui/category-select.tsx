'use client'
import { sortCategories, categorySearchTerms } from '@/i18n/category'
import { getCategoryName } from '@/i18n/category'
import { useTranslations, useLocale } from 'next-intl'

import { CustomSelect } from './custom-select'
import { type Category } from '@/lib/api/categories'

interface CategorySelectProps {
  categories: Category[]
  value: string
  onChange: (value: string) => void
  filterType?: 'income' | 'expense'
  excludeIds?: string[]
  name?: string
  label?: string
  placeholder?: string
  searchable?: boolean
  autoOpen?: boolean
}

export function CategorySelect({
  categories,
  value,
  onChange,
  filterType,
  excludeIds,
  name = 'category_id',
  label,
  placeholder,
  searchable = false,
  autoOpen = false,
}: CategorySelectProps) {
  const t = useTranslations('common')
  const locale = useLocale()
  const options = [
    { value: '', label: placeholder ?? t('noCategory') },
    ...sortCategories(categories, locale)
      .filter(c => !filterType || c.type === filterType)
      .filter(c => !excludeIds?.length || !excludeIds.includes(c.id))
      .map(c => ({ value: c.id, label: getCategoryName(c, locale), searchText: categorySearchTerms(c), icon: c.icon, color: c.color })),
  ]

  return (
    <CustomSelect
      label={label ?? t('category')}
      name={name}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchable={searchable}
      autoOpen={autoOpen}
    />
  )
}
