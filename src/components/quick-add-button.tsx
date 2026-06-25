'use client'

import { createClient } from '@/lib/supabase/client'
import { localYMD } from '@/lib/utils/date'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

function fmtAmount(v: string) {
  const d = v.replace(/\D/g, '')
  return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
}

type Cat  = { id: string; name: string; icon: string | null; color: string | null; type: string }
type Wall = { id: string; name: string; is_default: boolean }

export function QuickAddButton() {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [dataLoaded, setDataLoaded]   = useState(false)
  const [txType, setTxType]           = useState<'expense' | 'income'>('expense')
  const [amtDisplay, setAmtDisplay]   = useState('')
  const [categoryId, setCategoryId]   = useState('')
  const [walletId, setWalletId]       = useState('')
  const [note, setNote]               = useState('')
  const [date, setDate]               = useState(localYMD())
  const [error, setError]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [categories, setCategories]   = useState<Cat[]>([])
  const [wallets, setWallets]         = useState<Wall[]>([])
  const amountRef = useRef<HTMLInputElement>(null)

  // Fetch data once on first open
  useEffect(() => {
    if (!open || dataLoaded) return
    const supabase = createClient()
    Promise.all([
      supabase.from('categories').select('id, name, icon, color, type').order('is_default', { ascending: false }).order('name'),
      supabase.from('wallets').select('id, name, is_default').order('is_default', { ascending: false }).order('name'),
    ]).then(([{ data: cats }, { data: walls }]) => {
      setCategories((cats ?? []) as Cat[])
      setWallets((walls ?? []) as Wall[])
      const def = (walls ?? []).find(w => w.is_default)
      setWalletId(def?.id ?? walls?.[0]?.id ?? '')
      setDataLoaded(true)
    })
  }, [open, dataLoaded])

  // Auto-focus amount when data ready
  useEffect(() => {
    if (open && dataLoaded) setTimeout(() => amountRef.current?.focus(), 50)
  }, [open, dataLoaded])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    setOpen(false)
    setAmtDisplay('')
    setCategoryId('')
    setNote('')
    setDate(localYMD())
    setError('')
  }

  function handleTypeChange(t: 'expense' | 'income') {
    setTxType(t)
    setCategoryId('')
  }

  async function handleSubmit() {
    const amount = Number(amtDisplay.replace(/\./g, ''))
    if (!amount || amount <= 0) { setError('Enter a valid amount'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: txType,
          amount,
          category_id: categoryId || undefined,
          wallet_id:   walletId   || undefined,
          transaction_date: date,
          note: note || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed')
      }
      router.refresh()
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCats = categories.filter(c => c.type === txType)

  return (
    <>
      {/* ── FAB ─────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add transaction"
        className="fixed bottom-20 right-4 md:bottom-8 md:right-6 z-30 w-14 h-14 rounded-full bg-[#111111] dark:bg-white shadow-xl flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <svg className="text-white dark:text-gray-900" xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {/* ── Panel ───────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={close} />

          {/* Card */}
          <div className="animate-slide-up relative w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

            {/* Type toggle bar */}
            <div className="grid grid-cols-2">
              {(['expense', 'income'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`py-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
                    txType === t
                      ? t === 'expense'
                        ? 'bg-rose-500 text-white'
                        : 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {t === 'expense' ? '− Expense' : '+ Income'}
                </button>
              ))}
            </div>

            <div className="px-5 pt-5 pb-6 space-y-4">
              {/* Amount — protagonist */}
              <div className="relative flex items-center justify-center border-b-2 border-gray-200 dark:border-gray-700 pb-3 focus-within:border-gray-500 dark:focus-within:border-gray-400 transition-colors">
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="numeric"
                  value={amtDisplay}
                  onChange={e => setAmtDisplay(fmtAmount(e.target.value))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                  placeholder="0"
                  className="w-full text-center text-4xl font-light text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-200 dark:placeholder-gray-700 tabular-nums"
                />
                <span className="absolute right-0 text-sm text-gray-300 dark:text-gray-600 pointer-events-none">₫</span>
              </div>

              {/* Category chips */}
              {filteredCats.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {filteredCats.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
                      className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        categoryId === cat.id
                          ? 'text-white border-transparent'
                          : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                      }`}
                      style={categoryId === cat.id ? { backgroundColor: cat.color ?? '#374151' } : undefined}
                    >
                      {cat.icon && <span>{cat.icon}</span>}
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Wallet + Date */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={walletId}
                  onChange={e => setWalletId(e.target.value)}
                  className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                >
                  <option value="">No wallet</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>

                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
                />
              </div>

              {/* Note */}
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                placeholder="Note (optional)"
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
              />

              {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !amtDisplay}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
                  txType === 'expense'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {submitting ? 'Saving…' : `Save ${txType === 'expense' ? 'Expense' : 'Income'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
