'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LOCALES } from './locale'
import { FormError } from '@/components/ui/form-error'

/** Refreshing the current route preserves mounted forms and their drafts. */
export function LanguageSelector() {
  const locale = useLocale()
  const t = useTranslations('common')
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [refreshing, startTransition] = useTransition()
  const [error, setError] = useState(false)

  async function changeLocale(value: string) {
    setSaving(true)
    setError(false)
    try {
      const response = await fetch('/api/settings/locale', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: value }),
      })
      if (!response.ok) throw new Error('Locale save failed')
      startTransition(() => router.refresh())
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
        {t('language')}
        <select value={locale} disabled={saving || refreshing} onChange={event => changeLocale(event.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100">
          {LOCALES.map(value => <option key={value} value={value}>{value === 'vi' ? 'Tiếng Việt' : 'English'}</option>)}
        </select>
      </label>
      <span role="status" className="text-xs text-gray-500">{saving || refreshing ? t('savingLanguage') : ''}</span>
      <FormError message={error ? t('languageSaveFailed') : null} />
    </div>
  )
}
