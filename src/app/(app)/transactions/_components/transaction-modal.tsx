'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
import { TabGroup } from '@/components/ui/tab-group'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { type Category } from '@/lib/api/categories'
import { type Transaction, transactionsApi } from '@/lib/api/transactions'
import { type Wallet } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface TransactionModalProps {
  editing: Transaction | null
  categories: Category[]
  wallets: Wallet[]
  defaultDate?: string
  onClose: () => void
}

export function TransactionModal({ editing, categories, wallets, defaultDate, onClose }: TransactionModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>(editing?.type ?? 'expense')
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [walletId, setWalletId] = useState(
    editing ? (editing.wallet_id ?? '') : (wallets.find(w => w.is_default)?.id ?? '')
  )
  const [date, setDate] = useState(
    editing?.transaction_date ?? defaultDate ?? new Date().toISOString().slice(0, 10)
  )
  const [showFee, setShowFee] = useState(false)

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories
      .filter(c => c.type === txType)
      .map(c => ({ value: c.id, label: c.name, icon: c.icon, color: c.color })),
  ]

  const walletOptions = [
    { value: '', label: 'No wallet' },
    ...wallets.map(w => ({ value: w.id, label: w.name, color: w.color })),
  ]

  function handleTypeChange(t: 'income' | 'expense') {
    setTxType(t)
    setCategoryId('')
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
          note: note || undefined,
        }

        if (editing) {
          await transactionsApi.update(editing.id, base)
        } else {
          await transactionsApi.create(base)

          // Auto-create a separate expense transaction for the bank fee
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

  const canAddFee = !editing && txType === 'expense' && !!walletId

  return (
    <Modal title={editing ? 'Edit transaction' : 'New transaction'} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Type toggle */}
        <TabGroup
          tabs={[{ key: 'expense', label: '− Expense' }, { key: 'income', label: '+ Income' }]}
          value={txType}
          onChange={handleTypeChange}
          activeColors={{ expense: '#ef4444', income: '#22c55e' }}
        />

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Amount" name="amount" defaultValue={editing?.amount} required />
          <DatePicker label="Date" name="transaction_date" value={date} onChange={setDate} required />
        </div>

        {/* Category + Wallet */}
        <div className="grid grid-cols-2 gap-3">
          <CustomSelect label="Category" name="category_id" options={categoryOptions}
            value={categoryId} onChange={setCategoryId} placeholder="None" />
          {wallets.length > 0
            ? <CustomSelect label="Wallet" name="wallet_id" options={walletOptions}
                value={walletId} onChange={setWalletId} placeholder="None" />
            : <div />}
        </div>

        {/* Note */}
        <Input label="Note (optional)" name="note" defaultValue={editing?.note ?? ''}
          placeholder="e.g. Lunch with colleagues" />

        {/* Bank fee — only for new expense with a wallet selected */}
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
                  A separate &quot;Bank fee&quot; expense transaction will be created automatically — keeping your wallet balance in sync with the bank.
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
