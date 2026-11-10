import { Input } from '@/components/ui/input'
import { CategorySelect } from '@/components/ui/category-select'
import type { Category } from '@/lib/api/categories'
import type { ImportPreviewRow } from '@/lib/api/bank-import'
import { MAX_TITLE_LENGTH } from '@/lib/imports/bank-csv'
import { SignedAmount } from '@/components/ui/signed-amount'

export type ReviewedRow = ImportPreviewRow & { selected: boolean; title: string; category_id: string | null }

function ReviewRow({ row, categories, onChange, disabled }: {
  row: ReviewedRow; categories: Category[]; disabled: boolean; onChange: (change: Partial<ReviewedRow>) => void
}) {
  return (
    <article className="rounded-xl border border-hairline p-4 space-y-3">
      <label className="flex gap-3 items-start">
        <input type="checkbox" checked={row.selected} disabled={disabled || row.duplicate || row.conflict} onChange={event => onChange({ selected: event.target.checked })} className="mt-1" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{row.date} · CSV record {row.row}</span>
          <span className="block text-sm text-gray-500 whitespace-pre-wrap break-words">{row.description || '(No bank description)'}</span>
          {row.reference && <span className="block text-xs text-gray-400 break-all">Reference: {row.reference}</span>}
        </span>
        <SignedAmount amount={row.amount} positive={row.type === 'income'} className="text-sm whitespace-nowrap" />
      </label>
      {row.conflict ? <p className="text-sm text-rose-600">Previously imported reference has different data. Check the file before continuing.</p>
        : row.duplicate ? <p className="text-sm text-gray-500">Already imported into this wallet. Skipped, including if the recorded transaction was later edited or deleted.</p>
          : row.selected && (
            <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-3">
              <Input label="Title" id={`import-title-${row.row}`} value={row.title} maxLength={MAX_TITLE_LENGTH} required clearable={false} onChange={event => onChange({ title: event.target.value })} />
              <CategorySelect label={`Category for record ${row.row}`} categories={categories} filterType={row.type} value={row.category_id ?? ''} onChange={value => onChange({ category_id: value || null })} searchable />
            </fieldset>
          )}
    </article>
  )
}

export function ImportReview({ rows, categories, disabled, onChange }: {
  rows: ReviewedRow[]; categories: Category[]; disabled: boolean
  onChange: (row: number, change: Partial<ReviewedRow>) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Enter a title for each selected transaction. Already recorded manually, a transfer, or a debt payment? Uncheck it to avoid counting it as new income or spending.</p>
      {rows.map(row => <ReviewRow key={row.row} row={row} categories={categories} disabled={disabled} onChange={change => onChange(row.row, change)} />)}
    </div>
  )
}
