'use client'

import { AmountInput } from '@/components/ui/amount-input'
import { IconButton, EditIcon, TrashIcon } from '@/components/ui/icon-button'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DatePicker } from '@/components/ui/date-picker'
import { EmojiPickerInput } from '@/components/ui/emoji-picker'
import { Input } from '@/components/ui/input'
import { Modal, useModalClose } from '@/components/ui/modal'
import { TabGroup } from '@/components/ui/tab-group'
import { formatVND } from '@/lib/utils/currency'
import { type SavingGoal, savingGoalsApi } from '@/lib/api/saving-goals'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

// ── Goal Modal ────────────────────────────────────────────────────────────────

function GoalModal({ editing, onClose }: { editing: SavingGoal | null; onClose: () => void }) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [deadline, setDeadline] = useState(editing?.deadline ?? '')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const get = (n: string) => (form.elements.namedItem(n) as HTMLInputElement).value
    const name = get('name').trim()
    const target_amount = Number(get('target_amount'))
    const icon = get('icon').trim()

    if (!name) { setError('Name is required.'); return }
    if (!target_amount || target_amount <= 0) { setError('Target amount is required.'); return }

    setError(null)
    startTransition(async () => {
      try {
        if (editing) {
          await savingGoalsApi.update(editing.id, {
            name, icon: icon || undefined,
            target_amount,
            deadline: deadline || undefined,
            note: get('note') || undefined,
          })
        } else {
          await savingGoalsApi.create({
            name, icon: icon || undefined,
            target_amount,
            deadline: deadline || undefined,
            note: get('note') || undefined,
          })
        }
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title={editing ? 'Edit goal' : 'New saving goal'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <EmojiPickerInput label="Icon" name="icon" defaultValue={editing?.icon ?? ''} />
          <Input label="Goal name" name="name" defaultValue={editing?.name ?? ''} required placeholder="e.g. Buy a motorbike" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AmountInput label="Target amount" name="target_amount" defaultValue={editing?.target_amount} required />
          <DatePicker label="Deadline (optional)" name="deadline" value={deadline} onChange={setDeadline} />
        </div>
        <Input label="Note (optional)" name="note" defaultValue={editing?.note ?? ''} placeholder="Why this goal?" />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>{isPending ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Contribute Modal ──────────────────────────────────────────────────────────

function ContributeModal({ goal, onClose }: { goal: SavingGoal; onClose: () => void }) {
  const close = useModalClose()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const remaining = goal.target_amount - goal.current_amount

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const amount = Number((e.currentTarget.elements.namedItem('amount') as HTMLInputElement).value)
    if (!amount || amount <= 0) { setError('Please enter a valid amount.'); return }

    setError(null)
    startTransition(async () => {
      try {
        const newAmount = Math.min(goal.current_amount + amount, goal.target_amount)
        const isComplete = newAmount >= goal.target_amount
        await savingGoalsApi.update(goal.id, {
          current_amount: newAmount,
          ...(isComplete ? { status: 'completed' } : {}),
        })
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <Modal title="Add to goal" onClose={onClose}>
      <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{goal.icon} {goal.name}</p>
        <p className="font-semibold text-gray-900 dark:text-gray-100">{formatVND(remaining)} remaining</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AmountInput label="Amount to add" name="amount" required />
        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={close}>Cancel</Button>
          <Button type="submit" disabled={isPending} fullWidth>{isPending ? 'Saving...' : 'Add'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal, nowMs, onEdit, onDelete, onContribute,
}: {
  goal: SavingGoal
  nowMs: number
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
}) {
  const pct = goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0
  const isCompleted = goal.status === 'completed'
  const isCancelled = goal.status === 'cancelled'
  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline + 'T00:00:00').getTime() - nowMs) / 86400000)
    : null

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-hairline p-5 ${isCancelled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl shrink-0">
            {goal.icon ?? '🎯'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{goal.name}</p>
            {isCompleted && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Completed</span>}
            {!isCompleted && daysLeft !== null && (
              <p className={`text-xs ${daysLeft < 0 ? 'text-rose-500' : daysLeft < 30 ? 'text-yellow-500' : 'text-gray-400'}`}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-0.5 shrink-0">
          {!isCompleted && !isCancelled && (
            <IconButton label="Add money" onClick={onContribute} tone="positive">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </IconButton>
          )}
          <IconButton label="Edit goal" onClick={onEdit}>{EditIcon}</IconButton>
          <IconButton label="Delete goal" onClick={onDelete} tone="danger">{TrashIcon}</IconButton>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5 tabular-nums">
        <span>{formatVND(goal.current_amount)}</span>
        <span className="font-medium">{Math.round(pct)}%</span>
        <span>{formatVND(goal.target_amount)}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full animate-bar-fill ${isCompleted ? 'bg-emerald-500' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!isCompleted && (
        <p className="text-xs text-gray-400 mt-1.5 tabular-nums">
          {formatVND(goal.target_amount - goal.current_amount)} to go
        </p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SavingGoalsClient({ goals }: { goals: SavingGoal[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null)
  const [contributingGoal, setContributingGoal] = useState<SavingGoal | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  // Capture once at mount — stable across re-renders, avoids React Compiler impure warning
  const [nowMs] = useState(() => new Date().setHours(0, 0, 0, 0))

  const active = goals.filter(g => g.status === 'active')
  const completed = goals.filter(g => g.status !== 'active')
  const displayed = tab === 'active' ? active : completed

  const totalSaved = active.reduce((s, g) => s + Number(g.current_amount), 0)
  const totalTarget = active.reduce((s, g) => s + Number(g.target_amount), 0)

  function handleDeleteConfirmed() {
    if (!confirmId) return
    startTransition(async () => {
      try { await savingGoalsApi.delete(confirmId); router.refresh() }
      catch { /* toast later */ }
      finally { setConfirmId(null) }
    })
  }

  return (
    <>
      <button
        onClick={() => { setEditingGoal(null); setModalOpen(true) }}
        className="fixed bottom-above-nav right-4 md:bottom-6 md:right-6 z-40 w-12 h-12 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-[colors,transform] hover:scale-110 active:scale-95 flex items-center justify-center"
        aria-label="New saving goal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {active.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-hairline px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total saved</p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatVND(totalSaved)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-hairline px-4 py-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total target</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{formatVND(totalTarget)}</p>
          </div>
        </div>
      )}

      <TabGroup
        tabs={[
          { key: 'active', label: `Active (${active.length})` },
          { key: 'completed', label: `Completed (${completed.length})` },
        ]}
        value={tab}
        onChange={setTab}
        className="w-fit mb-5"
      />

      {displayed.length === 0 ? (
        <EmptyState
          message={tab === 'active' ? 'No active goals.' : 'No completed goals yet.'}
          action={tab === 'active' ? { label: 'Create your first goal', onClick: () => { setEditingGoal(null); setModalOpen(true) } } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayed.map((g, idx) => (
            <div key={g.id} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <GoalCard
                goal={g}
                nowMs={nowMs}
                onEdit={() => { setEditingGoal(g); setModalOpen(true) }}
                onDelete={() => setConfirmId(g.id)}
                onContribute={() => setContributingGoal(g)}
              />
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <GoalModal key={editingGoal?.id ?? 'new'} editing={editingGoal} onClose={() => { setModalOpen(false); setEditingGoal(null) }} />
      )}
      {contributingGoal && (
        <ContributeModal goal={contributingGoal} onClose={() => setContributingGoal(null)} />
      )}
      {confirmId && (
        <ConfirmModal
          title="Delete goal?"
          description="This saving goal will be permanently deleted."
          confirmLabel="Delete"
          isPending={isPending}
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirmId(null)}
        />
      )}
    </>
  )
}
