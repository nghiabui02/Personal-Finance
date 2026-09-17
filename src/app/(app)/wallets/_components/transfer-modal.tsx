'use client'

import { Modal, useModalClose } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/custom-select'
import { formatWithDots } from '@/components/ui/amount-input'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { type Wallet, WALLET_TYPE_ICONS } from '@/lib/api/wallets'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
  const [date, setDate] = useState(localYMD())
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

  // The balance lives under each select instead of in the option label — at half
  // width a long "name — 1.122.262 ₫" would truncate away the part that matters.
  const walletOptions = (list: Wallet[]) => list.map(w => ({
    value: w.id,
    label: w.name,
    // Always an icon: falling back to a colour dot changes the row height and
    // makes the field jump when the selection changes.
    icon: w.icon || WALLET_TYPE_ICONS[w.type],
    color: w.color ?? null,
  }))

  function swap() {
    if (!fromId || !toId) return
    setFromId(toId)
    setToId(fromId)
  }

  /** Current balance, or where it lands once the amount is entered. */
  function balanceLine(wallet: Wallet | undefined, delta: number, align: string) {
    if (!wallet) return <span />
    const after = Number(wallet.balance) + delta
    const changed = amount > 0
    return (
      <span className={`block min-w-0 text-xs tabular-nums truncate ${align} ${
        !changed ? 'text-gray-400 dark:text-gray-500'
          : delta < 0 ? 'text-rose-600 dark:text-rose-400'
          : 'text-emerald-600 dark:text-emerald-400'
      }`}>
        {formatVND(changed ? after : Number(wallet.balance))}
      </span>
    )
  }

  return (
    <Modal title="Transfer between wallets" size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* From → To on one row; the button between them swaps the direction */}
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-end">
            <div className="min-w-0">
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
            </div>
            <button
              type="button"
              onClick={swap}
              aria-label="Swap wallets"
              title="Swap"
              className="h-[42px] w-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0 transition-transform active:scale-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </button>
            <div className="min-w-0">
              <CustomSelect
                label="To"
                name="to_wallet"
                options={walletOptions(wallets.filter(w => w.id !== fromId))}
                value={toId}
                onChange={setToId}
              />
            </div>
          </div>

          <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-baseline">
            {balanceLine(fromWallet, -amount, 'text-left')}
            <span className="w-9" />
            {balanceLine(toWallet, amount, 'text-right')}
          </div>
        </div>

        {/* Amount + Date share a row — neither needs the full width */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={e => setAmountDisplay(formatWithDots(e.target.value))}
                placeholder="0"
                autoFocus
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2.5 pr-8 text-sm outline-none focus:border-brand"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">₫</span>
            </div>
          </div>
          <DatePicker label="Date" name="date" value={date} onChange={setDate} required />
        </div>

        <Input
          label="Note (optional)"
          name="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Monthly savings"
        />

        {insufficient && (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            Insufficient balance. Available: {formatVND(Number(fromWallet!.balance))}
          </p>
        )}

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

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
