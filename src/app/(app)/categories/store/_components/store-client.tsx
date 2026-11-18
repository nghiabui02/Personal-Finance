'use client'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { ScreenHeader } from '@/components/ui/screen-header'
import { TabGroup } from '@/components/ui/tab-group'
import { toastError } from '@/components/ui/toast'
import { Em } from '@/components/ui/verdict'
import { getCategoryName, sortCategories } from '@/i18n/category'
import { type Category, categoriesApi } from '@/lib/api/categories'

/**
 * Browse the shared category templates and add the ones you want. A template is
 * never used directly: adding it makes your own category, which is what
 * transactions and budgets then point at.
 */
export default function StoreClient({
  templates,
  addedTemplateIds,
}: {
  templates: Category[]
  addedTemplateIds: string[]
}) {
  const locale = useLocale()
  const t = useTranslations('categories')
  const router = useRouter()
  const [tab, setTab] = useState<'income' | 'expense'>('expense')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const ofTab = sortCategories(templates, locale).filter(template => template.type === tab)
  const addedCount = ofTab.filter(template => addedTemplateIds.includes(template.id)).length

  function add(template: Category) {
    setPendingId(template.id)
    startTransition(async () => {
      try {
        await categoriesApi.adopt(template.id)
        router.refresh()
      } catch (err) {
        toastError(err, t('couldNotAddTheCategory'))
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <>
      <ScreenHeader
        eyebrow={t('store')}
        headline={<>{t.rich('storeHeadline', { count: addedCount, total: ofTab.length, strong: chunks => <Em>{chunks}</Em> })}</>}
        controls={
          <TabGroup
            tabs={[{ key: 'expense', label: t('expense') }, { key: 'income', label: t('income') }]}
            value={tab}
            onChange={setTab}
            className="w-fit"
          />
        }
        action={<Button variant="secondary" onClick={() => router.push('/categories')}>{t('backToCategories')}</Button>}
      />

      {ofTab.length === 0 ? (
        <p className="py-20 text-center text-sm text-gray-400">{t('storeEmptyType')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ofTab.map(template => {
            const isAdded = addedTemplateIds.includes(template.id)
            return (
              <div key={template.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl px-4 py-3.5 border border-hairline">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
                  style={{ backgroundColor: template.color ? `${template.color}22` : '#f3f4f6' }}
                >
                  {template.icon ?? getCategoryName(template, locale)[0].toUpperCase()}
                </div>
                <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {getCategoryName(template, locale)}
                </p>
                {isAdded ? (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t('added')}</span>
                ) : (
                  <Button variant="secondary" onClick={() => add(template)} disabled={isPending}>
                    {pendingId === template.id ? t('adding') : t('add')}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
