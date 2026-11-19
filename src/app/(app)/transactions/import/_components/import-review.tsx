import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { CategorySelect } from '@/components/ui/category-select'
import type { Category } from '@/lib/api/categories'
import type { ImportPreviewRow } from '@/lib/api/bank-import'
import { MAX_TITLE_LENGTH } from '@/lib/imports/bank-csv'
import { SignedAmount } from '@/components/ui/signed-amount'

export type ReviewedRow = ImportPreviewRow & { selected: boolean; title: string; user_category_id: string | null }

function ReviewRow({ row, categories, onChange, disabled }: {
  row: ReviewedRow; categories: Category[]; disabled: boolean; onChange: (change: Partial<ReviewedRow>) => void
}) {
  const t = useTranslations('transactions')
  return (
    <article className="rounded-xl border border-hairline p-4 space-y-3">
      <label className="flex gap-3 items-start">
        <input type="checkbox" checked={row.selected} disabled={disabled || row.duplicate || row.conflict} onChange={event => onChange({ selected: event.target.checked })} className="mt-1" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{t('sentenceCsvRecord', { value0: row.date, value1: row.row })}</span>
          <span className="block text-sm text-gray-500 whitespace-pre-wrap break-words">{row.description || t('noBankDescription')}</span>
          {row.reference && <span className="block text-xs text-gray-400 break-all">{t('sentenceReference', { value0: row.reference })}</span>}
        </span>
        <SignedAmount amount={row.amount} positive={row.type === 'income'} className="text-sm whitespace-nowrap" />
      </label>
      {row.conflict ? <p className="text-sm text-rose-600">{t('previouslyImportedReferenceHasDifferentDataCheckTheFileBeforeContinuing')}</p>
        : row.duplicate ? <p className="text-sm text-gray-500">{t('alreadyImportedIntoThisWalletSkippedIncludingIfTheRecordedTransactionWas')}</p>
          : row.selected && (
            <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-3">
              <Input label={t('title')} id={`import-title-${row.row}`} value={row.title} maxLength={MAX_TITLE_LENGTH} required clearable={false} onChange={event => onChange({ title: event.target.value })} />
              <CategorySelect label={t('categoryForRecord', { row: row.row })} categories={categories} filterType={row.type} value={row.user_category_id ?? ''} onChange={value => onChange({ user_category_id: value || null })} searchable />
            </fieldset>
          )}
    </article>
  )
}

export function ImportReview({ rows, categories, disabled, onChange }: {
  rows: ReviewedRow[]; categories: Category[]; disabled: boolean
  onChange: (row: number, change: Partial<ReviewedRow>) => void
}) {
  const t = useTranslations('transactions')
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{t('enterATitleForEachSelectedTransactionAlreadyRecordedManuallyATransfer')}</p>
      {rows.map(row => <ReviewRow key={row.row} row={row} categories={categories} disabled={disabled} onChange={change => onChange(row.row, change)} />)}
    </div>
  )
}
