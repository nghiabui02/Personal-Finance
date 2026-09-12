'use client'

import { AmountInput, formatWithDots } from '@/components/ui/amount-input'
import { MONEY_IN, MONEY_OUT } from '@/lib/utils/colors'
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
import type { DebtOption } from '@/lib/types'
import type { FrequentTransaction } from '@/lib/server/frequent-transactions'
import type { ParsedDraft } from '@/lib/api/parse-transaction'
import { QuickParse } from './quick-parse'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface TransactionModalProps {
  editing: Transaction | null
  categories: Category[]
  wallets: Wallet[]
  debts: DebtOption[]
  /** Repeats offered as one-tap chips. Empty until there is enough history. */
  frequent?: FrequentTransaction[]
  defaultDate?: string
  onClose: () => void
}

/** Big centered amount display, tinted by transaction type */
function CenteredAmountInput({
  name,
  defaultValue,
  txType,
  onValueChange,
  autoFocus,
}: {
  name: string
  defaultValue?: number
  txType: 'income' | 'expense'
  onValueChange?: (value: number) => void
  autoFocus?: boolean
}) {
  const [display, setDisplay] = useState(
    defaultValue ? formatWithDots(String(defaultValue)) : ''
  )
  const rawValue = display.replace(/\./g, '')
  const isExpense = txType === 'expense'

  function handleChange(next: string) {
    setDisplay(next)
    onValueChange?.(Number(next.replace(/\./g, '')) || 0)
  }

  // The field grows with its content, so long amounts have to shrink instead
  // of pushing the modal open. Digits are already capped by formatWithDots.
  const sizeClass =
    display.length > 13 ? 'text-2xl'
    : display.length > 10 ? 'text-3xl'
    : 'text-4xl'

  return (
    <div className="text-center">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">Amount</p>
      <input type="hidden" name={name} value={rawValue} />
      <div className={`inline-flex items-baseline gap-1.5 max-w-full ${isExpense ? 'text-rose-500' : 'text-emerald-500'}`}>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={e => handleChange(formatWithDots(e.target.value))}
          placeholder="0"
          autoFocus={autoFocus}
          size={1}
          style={{ width: `${Math.max(display.length, 1)}ch`, maxWidth: '100%' }}
          className={`bg-transparent ${sizeClass} font-bold tabular-nums text-center outline-none placeholder:text-current caret-current min-w-0`}
        />
        <span className="text-xl font-semibold shrink-0">đ</span>
      </div>
      <div className={`mx-auto mt-2 h-0.5 w-36 rounded-full ${isExpense ? 'bg-rose-400' : 'bg-emerald-400'}`} />
    </div>
  )
}

export function TransactionModal({ editing, categories, wallets, debts, frequent = [], defaultDate, onClose }: TransactionModalProps) {
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
  const [showFee, setShowFee] = useState(Number(editing?.bank_fee) > 0)
  const [amountValue, setAmountValue] = useState(
    editing ? Number(editing.amount) - Number(editing.bank_fee ?? 0) : 0
  )
  const [feeValue, setFeeValue] = useState(Number(editing?.bank_fee) || 0)
  const [selectedDebtId, setSelectedDebtId] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  // Bumping this remounts the amount field so a picked chip replaces whatever
  // was typed, instead of the uncontrolled input keeping its old value.
  const [preset, setPreset] = useState<FrequentTransaction | null>(null)
  const [note, setNote] = useState(editing?.note ?? '')

  function applyFrequent(f: FrequentTransaction) {
    setTxType(f.type)
    setCategoryId(f.categoryId ?? '')
    if (f.walletId) setWalletId(f.walletId)
    setSelectedDebtId('')
    setAmountValue(f.amount)
    setPreset(f)
  }

  /** Fills the form from a parsed draft. Nothing is saved until the user submits. */
  function applyDraft(d: ParsedDraft) {
    setTxType(d.type)
    if (d.category_id) setCategoryId(d.category_id)
    if (d.wallet_id) setWalletId(d.wallet_id)
    if (d.date) setDate(d.date)
    setNote(d.note ?? '')
    setSelectedDebtId('')
    setAmountValue(d.amount)
    setPreset({
      key: `draft-${d.amount}-${d.category_id ?? ''}`,
      type: d.type,
      amount: d.amount,
      categoryId: d.category_id,
      categoryName: '',
      categoryIcon: null,
      walletId: d.wallet_id,
      note: d.note,
      count: 0,
    })
  }

  const walletOptions = [
    { value: '', label: 'No wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color })),
  ]

  // Detect if selected category is a debt-related one — by system_key, not
  // display name, so renaming a category (or i18n) never breaks this.
  const selectedCat = categories.find(c => c.id === categoryId)
  const isRepay   = selectedCat?.system_key === 'repay_debt'
  const isCollect = selectedCat?.system_key === 'collect_debt'
  const showDebtSelector = (isRepay || isCollect) && !editing

  // Filter debts by direction: repay=borrow debts, collect=lend debts
  const relevantDebts = showDebtSelector
    ? debts.filter(d => isRepay ? d.type === 'borrow' : d.type === 'lend')
    : []

  const debtOptions = [
    { value: '', label: 'Not linked' },
    ...relevantDebts.map(d => ({
      value: d.id,
      label: `${d.person_name} — ${formatVND(d.remaining_amount)} remaining`,
    })),
  ]

  const selectedDebt = relevantDebts.find(d => d.id === selectedDebtId)

  function handleTypeChange(t: 'income' | 'expense') {
    setTxType(t)
    setCategoryId('')
    setSelectedDebtId('')
    setMoreOpen(false)
    setPreset(null)
  }

  function handleCategoryChange(id: string) {
    setCategoryId(id)
    setSelectedDebtId('')
  }

  // Category tile grid: first 7 of the current type + a "More" tile
  const typeCategories = categories.filter(c => c.type === txType)
  const visibleCategories = typeCategories.slice(0, 7)
  const selectedInGrid = visibleCategories.some(c => c.id === categoryId)
  const overflowSelected = !selectedInGrid && selectedCat ? selectedCat : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const getValue = (name: string) => (form.elements.namedItem(name) as HTMLInputElement)?.value ?? ''

    const amount = Number(getValue('amount'))
    const fee    = Number(getValue('fee') || '0')

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
          note: note || (selectedDebt ? `Repayment to ${selectedDebt.person_name}` : undefined),
          // Folded into this one transaction — the server stores amount + fee
          // as the total, so the list shows a single row, not a separate fee row.
          bank_fee: fee > 0 ? fee : undefined,
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
        }

        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  const canAddFee = txType === 'expense' && !!walletId && !showDebtSelector

  return (
    <Modal title={editing ? 'Edit transaction' : 'New transaction'} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {!editing && <QuickParse onDraft={applyDraft} />}

        <TabGroup
          tabs={[{ key: 'expense', label: '− Expense' }, { key: 'income', label: '+ Income' }]}
          value={txType}
          onChange={handleTypeChange}
          activeTextColors={{ expense: MONEY_OUT, income: MONEY_IN }}
          size="lg"
        />

        <div className="py-2">
          <CenteredAmountInput
            key={`${txType}-${selectedDebtId || 'no-debt'}-${preset?.key ?? ''}`}
            name="amount"
            defaultValue={preset?.amount ?? (editing ? Number(editing.amount) - Number(editing.bank_fee ?? 0) : selectedDebt?.remaining_amount)}
            onValueChange={setAmountValue}
            autoFocus={!editing}
            txType={txType}
          />
        </div>

        {/* One-tap repeats — the same spend logged the same way before */}
        {!editing && frequent.length > 0 && (
          <div className="-mx-1 px-1 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 w-max">
              {frequent.map(f => {
                const active = preset?.key === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => applyFrequent(f)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                      active
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-hairline bg-gray-50 text-gray-600 hover:border-gray-300 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="leading-none">{f.categoryIcon ?? '🏷️'}</span>
                    <span className="font-medium">{f.categoryName}</span>
                    <span className="tabular-nums opacity-70">{formatVND(f.amount)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Category tiles */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</p>
          <div className="grid grid-cols-4 gap-2.5">
            {visibleCategories.map(c => {
              const active = c.id === categoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategoryChange(active ? '' : c.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 transition-colors ${
                    active
                      ? txType === 'expense'
                        ? 'border-rose-400 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-950/30'
                        : 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/30'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl leading-none">{c.icon ?? '🏷️'}</span>
                  <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate w-full text-center">
                    {c.name}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(o => !o)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 transition-colors ${
                overflowSelected
                  ? txType === 'expense'
                    ? 'border-rose-400 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-950/30'
                    : 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-950/30'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:border-gray-600'
              }`}
            >
              {overflowSelected ? (
                <span className="text-2xl leading-none">{overflowSelected.icon ?? '🏷️'}</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} className="text-gray-900 dark:text-gray-100">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                </svg>
              )}
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate w-full text-center">
                {overflowSelected ? overflowSelected.name : 'More'}
              </span>
            </button>
          </div>
          {moreOpen && (
            <div className="mt-2.5">
              <CategorySelect
                categories={categories} filterType={txType} label=""
                value={categoryId} onChange={handleCategoryChange} searchable />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {wallets.length > 0
            ? <CustomSelect label="Wallet" name="wallet_id" options={walletOptions}
                value={walletId} onChange={setWalletId} placeholder="None" />
            : <div />}
          <DatePicker label="Date" name="transaction_date" value={date} onChange={setDate} required />
        </div>

        {/* Debt selector — shown when category is Repay Debt / Collect Debt */}
        {showDebtSelector && (
          <div className="space-y-1.5">
            <CustomSelect
              label={isRepay ? 'Link to debt (borrowed)' : 'Link to debt (lent)'}
              name="debt_id"
              options={debtOptions}
              value={selectedDebtId}
              onChange={setSelectedDebtId}
              placeholder="Not linked"
            />
            {selectedDebt && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Remaining: {formatVND(selectedDebt.remaining_amount)} · Linking updates the debt record automatically
              </p>
            )}
          </div>
        )}

        <Input label="Note (optional)" name="note" value={note} onChange={e => setNote(e.target.value)}
          placeholder="e.g. Lunch with colleagues" />

        {canAddFee && (
          <div className="border-t border-hairline pt-3">
            {!showFee ? (
              <button type="button" onClick={() => setShowFee(true)}
                className="text-xs text-gray-400 hover:text-brand transition-colors flex items-center gap-1">
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
                    className="text-xs text-gray-400 hover:text-rose-500 transition-colors">
                    Remove
                  </button>
                </div>
                <AmountInput label="" name="fee" defaultValue={Number(editing?.bank_fee) || 0} onValueChange={setFeeValue} autoFocus />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Included in this transaction — total charged will be{' '}
                  <span className="font-medium text-gray-600 dark:text-gray-300 tabular-nums">
                    {formatVND(amountValue + feeValue)}
                  </span>.
                </p>
              </div>
            )}
          </div>
        )}

        {editing?.debt_payment_id && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
            This transaction is linked to a debt. Editing it will not update the debt balance.
          </p>
        )}

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" variant="success" disabled={isPending} fullWidth>
            {isPending ? 'Saving...' : 'Save transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
