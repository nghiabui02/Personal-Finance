'use client'

import { ConfirmModal } from '@/components/ui/confirm-modal'
import { TabGroup } from '@/components/ui/tab-group'
import { MONEY_SEGMENTS } from '@/components/ui/segment-nav'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Dot, Em } from '@/components/ui/verdict'
import { formatVND } from '@/lib/utils/currency'
import { type Debt, debtsApi } from '@/lib/api/debts'
import { type WalletChoice } from '@/lib/api/wallets'
import { useState } from 'react'
import { AdditionModal } from './addition-modal'
import { PaymentModal } from './payment-modal'
import { DebtCard } from './debt-card'
import { DebtModal } from './debt-modal'
import { useDeleteConfirmation } from '@/lib/hooks/use-delete-confirmation'
import { sumRemaining } from '@/lib/utils/totals'
import { AddButton } from '@/components/ui/add-button'


// ── Debt Section ──────────────────────────────────────────────────────────────

function DebtSection({
  title,
  color,
  debts,
  totalActive,
  onEdit,
  onDelete,
  onPay,
  onAddMore,
  onAdd,
}: {
  title: string
  color: 'indigo' | 'orange'
  debts: Debt[]
  totalActive: number
  onEdit: (d: Debt) => void
  onDelete: (id: string) => void
  onPay: (d: Debt) => void
  onAddMore: (d: Debt) => void
  onAdd: () => void
}) {
  const colorCls = color === 'indigo'
    ? { amount: 'text-brand', badge: 'bg-brand-soft text-brand', toggle: 'text-brand hover:text-brand-strong' }
    : { amount: 'text-orange-600 dark:text-orange-400', badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400', toggle: 'text-orange-500 hover:text-orange-700 dark:hover:text-orange-300' }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          {debts.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${colorCls.badge}`}>{debts.length}</span>
          )}
        </div>
        <span className={`text-sm font-semibold tabular-nums ${colorCls.amount}`}>{formatVND(totalActive)}</span>
      </div>

      {debts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-8 flex flex-col items-center gap-2">
          <p className="text-sm text-gray-400">No debts yet</p>
          <button onClick={onAdd} className={`text-xs font-medium ${colorCls.toggle} transition-colors`}>+ Add</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {debts.map((d, idx) => (
            <div key={d.id} className="animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <DebtCard debt={d}
                onEdit={() => onEdit(d)} onDelete={() => onDelete(d.id)} onPay={() => onPay(d)} onAddMore={() => onAddMore(d)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DebtsClient({
  debts,
  wallets,
}: {
  debts: Debt[]
  wallets: WalletChoice[]
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [defaultType, setDefaultType] = useState<'lend' | 'borrow'>('lend')
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [addingDebt, setAddingDebt] = useState<Debt | null>(null)
  const { confirmId, isPending, ask, cancel, confirm } = useDeleteConfirmation(
    id => debtsApi.delete(id), 'Could not delete the debt.',
  )

  const [tab, setTab] = useState<'active' | 'completed'>('active')

  const lendDebts = debts.filter(d => d.type === 'lend' && (tab === 'active' ? d.status !== 'completed' : d.status === 'completed'))
  const borrowDebts = debts.filter(d => d.type === 'borrow' && (tab === 'active' ? d.status !== 'completed' : d.status === 'completed'))

  const activeCount = debts.filter(d => d.status !== 'completed').length
  const completedCount = debts.filter(d => d.status === 'completed').length

  const outstanding = debts.filter(d => d.status !== 'completed')
  const totalLent = sumRemaining(outstanding, 'lend')
  const totalBorrowed = sumRemaining(outstanding, 'borrow')
  const netPosition = totalLent - totalBorrowed
  const nextDue = debts
    .filter(d => d.status !== 'completed' && d.due_date)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0]

  function openNew(type: 'lend' | 'borrow') {
    setDefaultType(type)
    setEditingDebt(null)
    setModalOpen(true)
  }

  return (
    <>
      <ScreenHeader
        eyebrow="Money"
        headline={
          activeCount === 0
            ? <>Nothing outstanding — no money lent out and none borrowed.</>
            : netPosition === 0
            ? <>Lending and borrowing cancel out at <Em>{formatVND(totalLent)}</Em> each way.</>
            : netPosition > 0
            ? <>You&rsquo;re owed <Em tone="good">{formatVND(netPosition)}</Em> more than you owe.</>
            : <>You owe <Em tone="bad">{formatVND(-netPosition)}</Em> more than you&rsquo;re owed.</>
        }
        support={activeCount > 0
          ? <>
              <span>{formatVND(totalLent)} lent</span><Dot />
              <span>{formatVND(totalBorrowed)} borrowed</span>
              {nextDue && <><Dot /><span>next due {nextDue.due_date}</span></>}
            </>
          : undefined}
        segments={MONEY_SEGMENTS}
        controls={
          <TabGroup
            tabs={[
              { key: 'active', label: `Active (${activeCount})` },
              { key: 'completed', label: `Completed (${completedCount})` },
            ]}
            value={tab}
            onChange={setTab}
            className="w-fit"
          />
        }
        action={
          <AddButton onClick={() => openNew('lend')}>New debt</AddButton>
        }
      />

      <div className="space-y-8">
        <DebtSection
          title="Lent"
          color="indigo"
          debts={lendDebts}
          totalActive={totalLent}
          onEdit={d => { setEditingDebt(d); setModalOpen(true) }}
          onDelete={id => ask(id)}
          onPay={d => setPayingDebt(d)}
          onAddMore={d => setAddingDebt(d)}
          onAdd={() => openNew('lend')}
        />
        <DebtSection
          title="Borrowed"
          color="orange"
          debts={borrowDebts}
          totalActive={totalBorrowed}
          onEdit={d => { setEditingDebt(d); setModalOpen(true) }}
          onDelete={id => ask(id)}
          onPay={d => setPayingDebt(d)}
          onAddMore={d => setAddingDebt(d)}
          onAdd={() => openNew('borrow')}
        />
      </div>

      {modalOpen && (
        <DebtModal
          key={editingDebt?.id ?? 'new'}
          editing={editingDebt}
          defaultType={defaultType}
          wallets={wallets}
          onClose={() => { setModalOpen(false); setEditingDebt(null) }}
        />
      )}
      {payingDebt && (
        <PaymentModal debt={payingDebt} wallets={wallets} onClose={() => setPayingDebt(null)} />
      )}
      {addingDebt && (
        <AdditionModal debt={addingDebt} wallets={wallets} onClose={() => setAddingDebt(null)} />
      )}
      {confirmId && (
        <ConfirmModal
          title="Delete debt?"
          description="The debt and its payment history will be permanently deleted. Wallet transactions already recorded stay — the money really did move."
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={confirm}
          onClose={cancel}
        />
      )}
    </>
  )
}
