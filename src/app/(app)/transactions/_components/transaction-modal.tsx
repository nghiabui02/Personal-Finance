'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { Button } from '@/components/ui/button'
import { CustomSelect } from '@/components/ui/custom-select'
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
  onClose: () => void
}

const todayStr = new Date().toISOString().slice(0, 10)

export function TransactionModal({ editing, categories, wallets, onClose }: TransactionModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [txType, setTxType] = useState<'income' | 'expense'>(editing?.type ?? 'expense')
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [walletId, setWalletId] = useState(editing?.wallet_id ?? wallets.find(w => w.is_default)?.id ?? '')
  const [date, setDate] = useState(editing?.transaction_date ?? todayStr)

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

  // Reset category when type changes
  function handleTypeChange(t: 'income' | 'expense') {
    setTxType(t)
    setCategoryId('')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const amount = Number((form.elements.namedItem('amount') as HTMLInputElement).value)
    const note = (form.elements.namedItem('note') as HTMLInputElement).value

    if (!amount || amount <= 0) { setError('Please enter a valid amount.'); return }
    if (!date) { setError('Please pick a date.'); return }

    setError(null)
    startTransition(async () => {
      try {
        const payload = {
          type: txType,
          amount,
          category_id: categoryId || undefined,
          wallet_id: walletId || undefined,
          transaction_date: date,
          note: note || undefined,
        }
        if (editing) {
          await transactionsApi.update(editing.id, payload)
        } else {
          await transactionsApi.create(payload)
        }
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title={editing ? 'Edit transaction' : 'New transaction'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Type toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(['expense', 'income'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                txType === t
                  ? t === 'expense'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-green-500 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'expense' ? '− Expense' : '+ Income'}
            </button>
          ))}
        </div>

        <AmountInput
          label="Amount"
          name="amount"
          defaultValue={editing?.amount}
          required
        />

        <CustomSelect
          label="Category"
          name="category_id"
          options={categoryOptions}
          value={categoryId}
          onChange={setCategoryId}
          placeholder="No category"
        />

        {wallets.length > 0 && (
          <CustomSelect
            label="Wallet"
            name="wallet_id"
            options={walletOptions}
            value={walletId}
            onChange={setWalletId}
            placeholder="No wallet"
          />
        )}

        <DatePicker
          label="Date"
          name="transaction_date"
          value={date}
          onChange={setDate}
          required
        />

        <Input
          label="Note (optional)"
          name="note"
          defaultValue={editing?.note ?? ''}
          placeholder="e.g. Lunch with colleagues"
        />

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
