'use client'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/components/ui/navigation-loading'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { ScreenHeader } from '@/components/ui/screen-header'
import { TabGroup } from '@/components/ui/tab-group'
import { toast, toastError } from '@/components/ui/toast'
import { Em } from '@/components/ui/verdict'
import { categorySearchTerms, getCategoryName, normalizeSearch, sortCategories } from '@/i18n/category'
import { type Category, type CategoryTemplate, categoriesApi } from '@/lib/api/categories'
import catalog from '@/lib/category-catalog.json'

/** Browse templates; the user's membership owns all personal state. */
export default function StoreClient({ templates, memberships }: { templates: CategoryTemplate[]; memberships: Category[] }) {
  const locale = useLocale()
  const t = useTranslations('categories')
  const router = useRouter()
  const navigation = useNavigation()
  const [tab, setTab] = useState<'income' | 'expense'>('expense')
  const [search, setSearch] = useState('')
  const [collection, setCollection] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const activeIds = new Set(memberships.filter(row => row.is_active).map(row => row.category_id))
  const removedIds = new Set(memberships.filter(row => !row.is_active).map(row => row.category_id))
  const ofTab = sortCategories(templates, locale).filter(template => template.type === tab)
  const matches = ofTab.filter(template => (!collection || template.collection === collection)
    && normalizeSearch(categorySearchTerms(template)).includes(normalizeSearch(search.trim())))
  const selectedIds = selected.filter(id => !activeIds.has(id))
  const collections = catalog.collections.filter(group => ofTab.some(template => template.collection === group.key))

  function add(ids: string[]) {
    setPendingIds(ids)
    startTransition(async () => {
      try {
        await categoriesApi.adopt(ids)
        setSelected(current => current.filter(id => !ids.includes(id)))
        toast.success(t('addedCount', { count: ids.length }))
        router.refresh()
      } catch (err) {
        toastError(err, t('couldNotAddTheCategory'))
      }
    })
  }

  return (
    <>
      <ScreenHeader eyebrow={t('store')}
        headline={<>{t.rich('storeHeadline', { count: ofTab.filter(template => activeIds.has(template.id)).length, total: ofTab.length, strong: chunks => <Em>{chunks}</Em> })}</>}
        controls={<TabGroup tabs={[{ key: 'expense', label: t('expense') }, { key: 'income', label: t('income') }]}
          value={tab} onChange={value => { setTab(value); setCollection('') }} className="w-fit" />}
        action={<Button variant="secondary" onClick={() => navigation.push('/categories')}>{t('backToCategories')}</Button>} />

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <Input label={t('searchStore')} value={search} onChange={event => setSearch(event.target.value)} />
        <CustomSelect name="collection" label={t('collection')} value={collection} onChange={setCollection}
          options={[{ value: '', label: t('allCollections') }, ...collections.map(group => ({ value: group.key, label: locale === 'en' ? group.en : group.vi }))]} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4" role="status" aria-live="polite">
        <p className="text-sm text-gray-500">{isPending ? t('addingCount', { count: pendingIds.length }) : t('selectedCount', { count: selectedIds.length })}</p>
        <Button loading={isPending} onClick={() => add(selectedIds)} disabled={isPending || !selectedIds.length}>{t('addSelected')}</Button>
      </div>
      {matches.length === 0 && <p className="py-12 text-center text-sm text-gray-400">{t('noStoreMatches')}</p>}
      <div className="space-y-6">
        {collections.map(group => {
          const rows = matches.filter(template => template.collection === group.key)
          if (!rows.length) return null
          return (
            <section key={group.key}>
              <h2 className="eyebrow text-gray-500 mb-3">{locale === 'en' ? group.en : group.vi}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {rows.map(template => {
                  const name = getCategoryName(template, locale)
                  const isAdded = activeIds.has(template.id)
                  return (
                    <div key={template.id} className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl px-4 py-3.5 border border-hairline">
                      {!isAdded && <input type="checkbox" aria-label={t('selectNamed', { name })} checked={selectedIds.includes(template.id)} disabled={isPending}
                        onChange={event => setSelected(current => event.target.checked ? [...current, template.id] : current.filter(id => id !== template.id))} className="h-4 w-4 accent-brand shrink-0" />}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: template.color ? `${template.color}22` : '#f3f4f6' }}>{template.icon ?? '🏷️'}</div>
                      <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
                      {isAdded ? <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('added')}</span>
                        : <Button loading={isPending && pendingIds.includes(template.id)} variant="secondary" onClick={() => add([template.id])} disabled={isPending}>
                          {isPending && pendingIds.includes(template.id) ? t('adding') : removedIds.has(template.id) ? t('addAgain') : t('add')}
                        </Button>}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
