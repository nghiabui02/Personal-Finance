'use client'

import { Modal, useModalClose } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { formatVND } from '@/lib/utils/currency'
import { type Wallet } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

function todayYMD() {
  return new Date().toISOString().slice(0, 10)
}

function formatWithDots(v: string) {
  const d = v.replace(/\D/g, '')
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
}

interface TransferModalProps {
  wallets: Wallet[]
  defaultFromId?: string
  onClose: () => void
}

export function TransferModal({ wallets, defaultFromId, onClose }: TransferModalProps) {
  const close = useModalClose()
  const router = useRouter()
  const [fromId, setFromId] = useState(defaultFromId ?? wallets[0]?.id ?? '')
  const [toId, setToId] = useState(
    wallets.find(w => w.id !== (defaultFromId ?? wallets[0]?.id))?.id ?? ''
  )
  const [amountDisplay, setAmountDisplay] = useState('')
  const [date, setDate] = useState(todayYMD())
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fromWallet = wallets.find(w => w.id === fromId)
  const toWallet = wallets.find(w => w.id === toId)
  const amount = Number(amountDisplay.replace(/\./g, ''))
  const insufficient = amount > 0 && fromWallet && amount > Number(fromWallet.balance)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fromId || !toId) return setError('Select both wallets.')
    if (fromId === toId) return setError('Source and destination must be different.')
    if (!amount || amount <= 0) return setError('Enter a valid amount.')

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_wallet_id: fromId, to_wallet_id: toId, amount, note: note.trim() || null, transfer_date: date }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const walletOptions = (list: Wallet[]) => list.map(w => ({
    value: w.id,
    label: `${w.name} — ${formatVND(w.balance)}`,
    icon: w.icon ?? null,
    color: w.color ?? null,
  }))

  return (
    <Modal title="Transfer between wallets" size="sm" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* From wallet */}
        <CustomSelect
          label="From"
          name="from_wallet"
          options={walletOptions(wallets)}
          value={fromId}
          onChange={v => {
            setFromId(v)
            if (toId === v) setToId(wallets.find(w => w.id !== v)?.id ?? '')
          }}
        />

        {/* Arrow + balance preview */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-blue-600 dark:text-blue-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
            </svg>
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* To wallet */}
        <CustomSelect
          label="To"
          name="to_wallet"
          options={walletOptions(wallets.filter(w => w.id !== fromId))}
          value={toId}
          onChange={setToId}
        />

        {/* Balance after preview */}
        {amount > 0 && fromWallet && toWallet && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between text-xs text-gray-500 dark:text-gray-400 gap-4">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300 truncate">{fromWallet.icon} {fromWallet.name}</p>
              <p className="mt-0.5 text-red-500">{formatVND(Number(fromWallet.balance) - amount)}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-700 dark:text-gray-300 truncate">{toWallet.icon} {toWallet.name}</p>
              <p className="mt-0.5 text-green-600">{formatVND(Number(toWallet.balance) + amount)}</p>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={amountDisplay}
              onChange={e => setAmountDisplay(formatWithDots(e.target.value))}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 pr-14 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {amountDisplay && (
                <button type="button" onClick={() => setAmountDisplay('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <span className="text-sm text-gray-400 pointer-events-none">₫</span>
            </div>
          </div>
        </div>

        <DatePicker label="Date" name="date" value={date} onChange={setDate} required />

        <Input
          label="Note (optional)"
          name="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Monthly savings"
        />

        {insufficient && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Insufficient balance. Available: {formatVND(Number(fromWallet!.balance))}
          </p>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={saving || !amount || fromId === toId || !!insufficient} className="flex-1">
            {saving ? 'Transferring…' : 'Transfer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
