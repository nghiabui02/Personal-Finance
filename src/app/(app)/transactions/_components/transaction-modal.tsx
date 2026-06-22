'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CategorySelect } from '@/components/ui/category-select'
import { CustomSelect } from '@/components/ui/custom-select'
import { TabGroup } from '@/components/ui/tab-group'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { type Category } from '@/lib/api/categories'
import { type Transaction, transactionsApi } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type DebtOption = { id: string; type: 'lend' | 'borrow'; person_name: string; remaining_amount: number }

interface TransactionModalProps {
  editing: Transaction | null
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  defaultDate?: string
  onClose: () => void
}

// Debt category names as defined in debt-categories.ts
const REPAY_NAMES = ['trả nợ', 'repay debt']
const COLLECT_NAMES = ['thu nợ', 'collect debt']

function isDebtCategory(name: string, list: string[]) {
  return list.some(n => name.toLowerCase().includes(n))
}

export function TransactionModal({ editing, categories, wallets, debts, defaultDate, onClose }: TransactionModalProps) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>(editing?.type ?? 'expense')
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [walletId, setWalletId] = useState(
    editing ? (editing.wallet_id ?? '') : (wallets.find(w => w.is_default)?.id ?? '')
  )
  const [date, setDate] = useState(
    editing?.transaction_date ?? defaultDate ?? localYMD()
  )
  const [showFee, setShowFee] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState('')

  const walletOptions = [
    { value: '', label: 'No wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color })),
  ]

  // Detect if selected category is a debt-related one
  const selectedCat = categories.find(c => c.id === categoryId)
  const isRepay   = selectedCat ? isDebtCategory(selectedCat.name, REPAY_NAMES) : false
  const isCollect = selectedCat ? isDebtCategory(selectedCat.name, COLLECT_NAMES) : false
  const showDebtSelector = (isRepay || isCollect) && !editing

  // Filter debts by direction: repay=borrow debts, collect=lend debts
  const relevantDebts = showDebtSelector
    ? debts.filter(d => isRepay ? d.type === 'borrow' : d.type === 'lend')
    : []

  const debtOptions = [
    { value: '', label: 'Không liên kết' },
    ...relevantDebts.map(d => ({
      value: d.id,
      label: `${d.person_name} — ${formatVND(d.remaining_amount)} còn lại`,
    })),
  ]

  const selectedDebt = relevantDebts.find(d => d.id === selectedDebtId)

  function handleTypeChange(t: 'income' | 'expense') {
    setTxType(t)
    setCategoryId('')
    setSelectedDebtId('')
  }

  function handleCategoryChange(id: string) {
    setCategoryId(id)
    setSelectedDebtId('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const getValue = (name: string) => (form.elements.namedItem(name) as HTMLInputElement)?.value ?? ''

    const amount = Number(getValue('amount'))
    const fee    = Number(getValue('fee') || '0')
    const note   = getValue('note')

    if (!amount || amount <= 0) { setError('Please enter a valid amount.'); return }
    if (!date) { setError('Please pick a date.'); return }

    setError(null)
    startTransition(async () => {
      try {
        const base = {
          type: txType,
          amount,
          category_id: categoryId || undefined,
          wallet_id: walletId || undefined,
          transaction_date: date,
          note: note || (selectedDebt ? `Trả nợ: ${selectedDebt.person_name}` : undefined),
        }

        if (editing) {
          await transactionsApi.update(editing.id, base)
        } else if (selectedDebtId && amount > 0) {
          // Debt payment: the payments API creates the transaction + adjusts balance atomically
          const res = await fetch(`/api/debts/${selectedDebtId}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, note: note || undefined, wallet_id: walletId || undefined, date }),
          })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Failed to record debt payment.')
          }
        } else {
          await transactionsApi.create(base)

          if (fee > 0 && walletId) {
            await transactionsApi.create({
              type: 'expense',
              amount: fee,
              wallet_id: walletId,
              transaction_date: date,
              note: `Bank fee${note ? ` (${note})` : ''}`,
            })
          }
        }

        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  const canAddFee = !editing && txType === 'expense' && !!walletId && !showDebtSelector

  return (
    <Modal title={editing ? 'Edit transaction' : 'New transaction'} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        <TabGroup
          tabs={[{ key: 'expense', label: '− Expense' }, { key: 'income', label: '+ Income' }]}
          value={txType}
          onChange={handleTypeChange}
          activeColors={{ expense: '#ef4444', income: '#22c55e' }}
        />

        <div className="grid grid-cols-2 gap-3">
          <AmountInput key={selectedDebtId || 'no-debt'} label="Amount" name="amount" defaultValue={editing?.amount ?? selectedDebt?.remaining_amount} required />
          <DatePicker label="Date" name="transaction_date" value={date} onChange={setDate} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <CategorySelect
            categories={categories} filterType={txType}
            value={categoryId} onChange={handleCategoryChange} searchable />
          {wallets.length > 0
            ? <CustomSelect label="Wallet" name="wallet_id" options={walletOptions}
                value={walletId} onChange={setWalletId} placeholder="None" />
            : <div />}
        </div>

        {/* Debt selector — shown when category is Trả nợ / Thu nợ */}
        {showDebtSelector && (
          <div className="space-y-1.5">
            <CustomSelect
              label={isRepay ? 'Liên kết khoản nợ (borrow)' : 'Liên kết khoản nợ (lend)'}
              name="debt_id"
              options={debtOptions}
              value={selectedDebtId}
              onChange={setSelectedDebtId}
              placeholder="Không liên kết"
            />
            {selectedDebt && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Còn lại: {formatVND(selectedDebt.remaining_amount)} · Linking sẽ cập nhật debt record tự động
              </p>
            )}
          </div>
        )}

        <Input label="Note (optional)" name="note" defaultValue={editing?.note ?? ''}
          placeholder="e.g. Lunch with colleagues" />

        {canAddFee && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
            {!showFee ? (
              <button type="button" onClick={() => setShowFee(true)}
                className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                </svg>
                Add bank fee (for international transactions)
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Bank fee</p>
                  <button type="button" onClick={() => setShowFee(false)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    Remove
                  </button>
                </div>
                <AmountInput label="" name="fee" defaultValue={0} />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  A separate &quot;Bank fee&quot; expense transaction will be created automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {editing?.debt_payment_id && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
            Giao dịch này liên kết với một khoản nợ. Chỉnh sửa sẽ không cập nhật số dư nợ.
          </p>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
