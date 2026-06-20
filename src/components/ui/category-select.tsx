'use client'

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
}

export function CategorySelect({
  categories,
  value,
  onChange,
  filterType,
  excludeIds,
  name = 'category_id',
  label = 'Category',
  placeholder = 'No category',
  searchable = false,
}: CategorySelectProps) {
  const options = [
    { value: '', label: placeholder },
    ...categories
      .filter(c => !filterType || c.type === filterType)
      .filter(c => !excludeIds?.length || !excludeIds.includes(c.id))
      .map(c => ({ value: c.id, label: c.name, icon: c.icon, color: c.color })),
  ]

  return (
    <CustomSelect
      label={label}
      name={name}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchable={searchable}
    />
  )
}
