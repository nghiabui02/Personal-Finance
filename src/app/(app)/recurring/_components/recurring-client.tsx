'use client'
import { useTranslations } from 'next-intl'

import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmModal } from '@/components/ui/confirm-modal'
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
import { AddButton } from '@/components/ui/add-button'

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
  const t = useTranslations('recurring')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null)
  const { confirmId, isPending, ask, cancel, confirm } = useDeleteConfirmation(
    id => recurringApi.delete(id), t('couldNotDeleteTheRecurringRule'),
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
        eyebrow={t('money')}
        headline={
          running.length === 0
            ? <>{t('noRulesAreRunningAddOneForRentASubscriptionOrYour')}</>
            : monthlyIn > 0
            ? <>{t.rich('sentenceStandingRulesMoveOutAndInEveryMonth', { value0: () => <Em tone="bad">{formatVND(monthlyOut)}</Em>, value1: () => <Em tone="good">{formatVND(monthlyIn)}</Em> })}</>
            : <>{t.rich('sentenceStandingRulesMoveOutEveryMonth', { value0: () => <Em tone="bad">{formatVND(monthlyOut)}</Em> })}</>
        }
        support={
          <>
            <span>{t('sentenceRunning', { value0: running.length })}</span>
            {pausedCount > 0 && <><Dot /><span>{t('sentencePaused', { value0: pausedCount })}</span></>}
            {nextRun && <><Dot /><span>{t('sentenceNextOn', { value0: nextRun })}</span></>}
          </>
        }
        action={
          <AddButton onClick={() => { setEditingItem(null); setModalOpen(true) }}>{t('newRule')}</AddButton>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          message={t('noRecurringTransactionsYet')}
          action={{ label: t('addYourFirstOne'), onClick: () => { setEditingItem(null); setModalOpen(true) } }}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <p className="eyebrow text-gray-400 dark:text-gray-500 mb-3">{t('sentenceActive', { value0: active.length })}</p>
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
              <p className="eyebrow text-gray-400 dark:text-gray-500 mb-3">{t('sentenceEnded', { value0: expired.length })}</p>
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
          title={t('deleteRecurringTransaction')}
          description={t('futureTransactionsWonTBeCreatedPastTransactionsAlreadyCreatedAreKept')}
          confirmLabel={t('delete')}
          isPending={isPending}
          onConfirm={confirm}
          onClose={cancel} />
      )}
    </>
  )
}
