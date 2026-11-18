'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LOCALES } from './locale'
import { CustomSelect } from '@/components/ui/custom-select'
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
      <fieldset
        disabled={saving || refreshing}
        aria-label={t('language')}
        className="flex items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300 disabled:opacity-60"
      >
        <span aria-hidden="true">{t('language')}</span>
        <div className="w-40 shrink-0">
          <CustomSelect
            label={null}
            name="locale"
            value={locale}
            onChange={changeLocale}
            options={LOCALES.map(value => ({ value, label: value === 'vi' ? 'Tiếng Việt' : 'English' }))}
          />
        </div>
      </fieldset>
      <span role="status" className="text-xs text-gray-500">{saving || refreshing ? t('savingLanguage') : ''}</span>
      <FormError message={error ? t('languageSaveFailed') : null} />
    </div>
  )
}
