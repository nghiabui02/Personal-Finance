'use client'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { MONEY_SEGMENTS } from '@/components/ui/segment-nav'
import { ScreenHeader } from '@/components/ui/screen-header'
import { Dot, Em } from '@/components/ui/verdict'
import { formatVND } from '@/lib/utils/currency'
import { localYMD } from '@/lib/utils/date'
import { type Category } from '@/lib/api/categories'
import { type Wallet } from '@/lib/api/wallets'
import { type RecurringTransaction, recurringApi } from '@/lib/api/recurring-transactions'
import { useState } from 'react'
import { useDeleteConfirmation } from '@/lib/hooks/use-delete-confirmation'
import { RecurringModal } from './recurring-modal'
import { RecurringCard } from './recurring-card'

/** Rough per-month value of a rule, for comparing rules on different clocks. */
const MONTHLY_MULTIPLIER: Record<RecurringTransaction['frequency'], number> = {
  daily: 30,
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function RecurringClient({
  items, categories, wallets,
}: {
  items: RecurringTransaction[]
  categories: Category[]
  wallets: Wallet[]
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null)
  const { confirmId, isPending, ask, cancel, confirm } = useDeleteConfirmation(
    id => recurringApi.delete(id), 'Could not delete the recurring rule.',
  )

  const active  = items.filter(i => !i.end_date || i.end_date >= localYMD())
  const expired = items.filter(i => i.end_date && i.end_date < localYMD())

  // Rules repeat on different clocks; the only comparable figure is per month.
  const running = active.filter(i => i.active)
  const monthly = (item: RecurringTransaction) =>
    (Number(item.amount) + Number(item.bank_fee ?? 0)) * MONTHLY_MULTIPLIER[item.frequency]
  const monthlyOut = running.filter(i => i.type === 'expense').reduce((s, i) => s + monthly(i), 0)
  const monthlyIn  = running.filter(i => i.type === 'income').reduce((s, i) => s + monthly(i), 0)
  const pausedCount = active.length - running.length
  const nextRun = running
    .map(i => i.next_run_date)
    .filter((d): d is string => !!d)
    .sort()[0]

  return (
    <>
      <ScreenHeader
        eyebrow="Money"
        headline={
          running.length === 0
            ? <>No rules are running — add one for rent, a subscription, or your salary.</>
            : monthlyIn > 0
            ? <>Standing rules move <Em tone="bad">{formatVND(monthlyOut)}</Em> out and <Em tone="good">{formatVND(monthlyIn)}</Em> in every month.</>
            : <>Standing rules move <Em tone="bad">{formatVND(monthlyOut)}</Em> out every month.</>
        }
        support={
          <>
            <span>{running.length} running</span>
            {pausedCount > 0 && <><Dot /><span>{pausedCount} paused</span></>}
            {nextRun && <><Dot /><span>next on {nextRun}</span></>}
          </>
        }
        segments={MONEY_SEGMENTS}
        action={
          <Button onClick={() => { setEditingItem(null); setModalOpen(true) }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New rule
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          message="No recurring transactions yet."
          action={{ label: 'Add your first one', onClick: () => { setEditingItem(null); setModalOpen(true) } }}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-3">Active ({active.length})</p>
              <div className="space-y-2">
                {active.map(item => (
                  <RecurringCard key={item.id} item={item}
                    onEdit={() => { setEditingItem(item); setModalOpen(true) }}
                    onDelete={() => ask(item.id)} />
                ))}
              </div>
            </section>
          )}
          {expired.length > 0 && (
            <section>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-3">Ended ({expired.length})</p>
              <div className="space-y-2">
                {expired.map(item => (
                  <RecurringCard key={item.id} item={item}
                    onEdit={() => { setEditingItem(item); setModalOpen(true) }}
                    onDelete={() => ask(item.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {modalOpen && (
        <RecurringModal key={editingItem?.id ?? 'new'} editing={editingItem}
          categories={categories} wallets={wallets}
          onClose={() => { setModalOpen(false); setEditingItem(null) }} />
      )}

      {confirmId && (
        <ConfirmModal
          title="Delete recurring transaction?"
          description="Future transactions won't be created. Past transactions already created are kept."
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={confirm}
          onClose={cancel} />
      )}
    </>
  )
}
