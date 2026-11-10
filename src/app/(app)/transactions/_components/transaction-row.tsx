'use client'

import { IconButton, EditIcon, TrashIcon } from '@/components/ui/icon-button'
import { type Transaction } from '@/lib/api/transactions'
import { formatVND } from '@/lib/utils/currency'

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
          aria-label={`Select ${tx.note || cat?.name || 'transaction'}`}
          className="shrink-0 accent-[var(--brand)]"
        />
      )}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base"
        style={{ backgroundColor: cat?.color ? `${cat.color}22` : '#f3f4f6' }}
      >
        {cat?.icon ?? <span className="text-xs font-semibold text-gray-400">{cat?.name?.[0] ?? '?'}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {tx.note || cat?.name || 'Uncategorized'}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {cat?.name && tx.note ? cat.name : tx.wallets?.name ?? ''}
        </p>
      </div>

      <div className="text-right shrink-0">
        <span className={`text-sm font-semibold tabular-nums ${
          tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {tx.type === 'income' ? '+' : '−'}{formatVND(tx.amount)}
        </span>
        {Number(tx.bank_fee) > 0 && (
          <span className="block text-[10px] text-gray-400 tabular-nums">
            incl. {formatVND(tx.bank_fee!)} fee
          </span>
        )}
      </div>

      {!selection && (
        <div className="flex gap-0.5">
          {!tx.transfer_pair_id && (
            <IconButton label="Edit transaction" onClick={() => onEdit(tx)}>{EditIcon}</IconButton>
          )}
          <IconButton label="Delete transaction" onClick={() => onDelete(tx.id)} tone="danger">{TrashIcon}</IconButton>
        </div>
      )}
    </div>
  )
}
