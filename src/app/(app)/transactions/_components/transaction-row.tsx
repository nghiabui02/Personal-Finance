'use client'
import { getCategoryName } from '@/i18n/category'
import { useLocale, useTranslations } from 'next-intl'

import { IconButton, EditIcon, TrashIcon } from '@/components/ui/icon-button'
import { type Transaction } from '@/lib/api/transactions'
import { formatVND } from '@/lib/utils/currency'
import { SignedAmount } from '@/components/ui/signed-amount'

/** Present only while the list is in selection mode. */
interface RowSelection {
  selected: boolean
  onToggle: (id: string) => void
}

export function TransactionRow({
  tx,
  onEdit,
  onDelete,
  selection,
}: {
  tx: Transaction
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
  selection?: RowSelection
}) {
  const locale = useLocale()
  const t = useTranslations('transactions')
  const cat = tx.categories

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        selection ? 'cursor-pointer' : ''
      } ${selection?.selected ? 'bg-brand-soft' : ''}`}
      onClick={selection ? () => selection.onToggle(tx.id) : undefined}
    >
      {selection && (
        <input
          type="checkbox"
          checked={selection.selected}
          onChange={() => selection.onToggle(tx.id)}
          onClick={e => e.stopPropagation()}
          aria-label={t('selectTransaction', { name: tx.note || (cat ? getCategoryName(cat, locale) : '') })}
          className="shrink-0 accent-[var(--brand)]"
        />
      )}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
        style={{ backgroundColor: cat?.color ? `${cat.color}22` : '#f3f4f6' }}
      >
        {cat?.icon ?? <span className="text-xs font-semibold text-gray-400">{(cat ? getCategoryName(cat, locale) : undefined)?.[0] ?? '?'}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {tx.note || (cat ? getCategoryName(cat, locale) : undefined) || t('uncategorized')}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {(cat ? getCategoryName(cat, locale) : undefined) && tx.note ? getCategoryName(cat!, locale) : tx.wallets?.name ?? ''}
        </p>
      </div>

      <div className="text-right shrink-0">
        <SignedAmount amount={tx.amount} positive={tx.type === 'income'} className="text-sm" />
        {Number(tx.bank_fee) > 0 && (
          <span className="block text-[10px] text-gray-400 tabular-nums">{t('sentenceInclFee', { value0: formatVND(tx.bank_fee!) })}</span>
        )}
      </div>

      {!selection && (
        <div className="flex gap-0.5">
          {!tx.transfer_pair_id && (
            <IconButton label={t('editTransaction')} onClick={() => onEdit(tx)}>{EditIcon}</IconButton>
          )}
          <IconButton label={t('deleteTransaction')} onClick={() => onDelete(tx.id)} tone="danger">{TrashIcon}</IconButton>
        </div>
      )}
    </div>
  )
}
