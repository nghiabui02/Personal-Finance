import { CATEGORY_RELATION } from '@/lib/category-columns'
import { getLocale, getTranslations } from 'next-intl/server'
import { getCategoryName } from '@/i18n/category'
import type { CategoryRef as Category } from '@/lib/types'
import { NextResponse } from 'next/server'
import { badRequest, noContent, withAuth, supabaseError } from '@/lib/server/route'
import { getBudgetsForMonth } from '@/lib/server/budget-rollover'
import { formatSignedVND, formatVND } from '@/lib/utils/currency'
import { formatMonthDay, localYM, localYMD, shiftLocalDate } from '@/lib/utils/date'

export type NotificationSeverity = 'alert' | 'warning' | 'info' | 'success'

export type AppNotification = {
  id: string
  type:
    | 'budget_over' | 'budget_near'
    | 'debt_overdue' | 'debt_due'
    | 'recurring_upcoming'
    | 'goal_reached' | 'goal_deadline'
    | 'credit_high'
  severity: NotificationSeverity
  title: string
  detail?: string
  href: string
  read: boolean
}

const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  alert: 0, warning: 1, info: 2, success: 3,
}

type CategoryRef = Category | null

function shortDate(ymd: string, locale: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return formatMonthDay(new Date(y, m - 1, d), locale)
}

export const GET = withAuth(async (_request, { supabase, user }) => {
  const locale = await getLocale()
  const t = await getTranslations('notifications')
  const today = localYMD()
  const debtHorizon = shiftLocalDate(today, 7)
  const recurringHorizon = shiftLocalDate(today, 3)
  const goalHorizon = shiftLocalDate(today, 14)

  const [
    budgetRows,
    { data: debtRows },
    { data: recurringRows },
    { data: goalRows },
    { data: creditWallets },
    { data: stateRows },
  ] = await Promise.all([
    getBudgetsForMonth(supabase, user.id, localYM()).then(rows => rows.filter(b => b.active)),
    supabase.from('debts')
      .select('id, type, person_name, remaining_amount, due_date')
      .eq('user_id', user.id).eq('status', 'active'),
    supabase.from('recurring_transactions')
      .select(`id, type, amount, note, frequency, next_run_date, end_date, ${CATEGORY_RELATION}`)
      .eq('user_id', user.id)
      // A paused rule will not run, so there is nothing upcoming to announce.
      .eq('active', true)
      .not('next_run_date', 'is', null)
      .lte('next_run_date', recurringHorizon),
    supabase.from('saving_goals')
      .select('id, name, icon, target_amount, current_amount, deadline')
      .eq('user_id', user.id).eq('status', 'active'),
    supabase.from('wallets')
      .select('id, name, balance, credit_limit')
      .eq('user_id', user.id).eq('type', 'credit'),
    supabase.from('notification_states')
      .select('notification_id, read_at, dismissed_at')
      .eq('user_id', user.id),
  ])

  const notifications: Omit<AppNotification, 'read'>[] = []

  // Budgets: over / nearly full (this month) — effectiveAmount already
  // includes rollover carry, inactive rows already filtered out
  for (const b of budgetRows) {
    const cat = b.categories
    if (!cat || !b.user_category_id) continue
    const amount = b.effectiveAmount
    const spent = b.spent
    const pct = amount > 0 ? spent / amount : 0
    const label = `${cat.icon ?? ''} ${getCategoryName(cat, locale)}`.trim()
    if (spent > amount) {
      notifications.push({
        id: `budget_over:${b.id}`, type: 'budget_over', severity: 'alert',
        title: t('overBudget', { category: label }),
        detail: t('budgetSpent', { spent: formatVND(spent), amount: formatVND(amount) }),
        href: '/budgets',
      })
    } else if (pct >= 0.8) {
      notifications.push({
        id: `budget_near:${b.id}`, type: 'budget_near', severity: 'warning',
        title: t('nearBudget', { category: label }),
        detail: t('budgetUsed', { percent: Math.round(pct * 100), amount: formatVND(amount - spent) }),
        href: '/budgets',
      })
    }
  }

  // Debts: overdue / due within 7 days
  for (const d of debtRows ?? []) {
    const remaining = Number(d.remaining_amount)
    if (remaining <= 0 || !d.due_date || d.due_date > debtHorizon) continue
    const isOverdue = d.due_date < today
    const direction = d.type === 'lend'
      ? t('owedBy', { person: d.person_name })
      : t('owedTo', { person: d.person_name })
    notifications.push({
      // due_date + phase in the id so a dismissed notification re-arms
      // when the deadline changes or the debt turns overdue
      id: `${isOverdue ? 'debt_overdue' : 'debt_due'}:${d.id}:${d.due_date}`,
      type: isOverdue ? 'debt_overdue' : 'debt_due',
      severity: isOverdue ? 'alert' : 'warning',
      title: isOverdue ? t('overdueDebt', { direction }) : t('debtSoon', { direction }),
      detail: t('debtRemaining', { amount: formatVND(remaining), date: shortDate(d.due_date, locale) }),
      href: '/debts',
    })
  }

  // Recurring transactions running within 3 days
  for (const r of recurringRows ?? []) {
    if (!r.next_run_date) continue
    if (r.end_date && r.end_date < r.next_run_date) continue
    const cat = r.categories as unknown as CategoryRef
    const label = r.note || (cat ? getCategoryName(cat, locale) : t(r.type === 'income' ? 'income' : 'expense'))
    notifications.push({
      id: `recurring:${r.id}:${r.next_run_date}`, type: 'recurring_upcoming', severity: 'info',
      title: t('upcomingRecurring', { label }),
      detail: t('recurringAmount', { amount: formatSignedVND(Number(r.amount), r.type === 'income'), date: shortDate(r.next_run_date, locale) }),
      href: '/recurring',
    })
  }

  // Saving goals: reached / deadline approaching
  for (const g of goalRows ?? []) {
    const target = Number(g.target_amount)
    const current = Number(g.current_amount)
    const label = `${g.icon ?? ''} ${g.name}`.trim()
    if (target > 0 && current >= target) {
      notifications.push({
        id: `goal_reached:${g.id}`, type: 'goal_reached', severity: 'success',
        title: t('goalReached', { label }),
        detail: t('goalSaved', { amount: formatVND(current) }),
        href: '/saving-goals',
      })
    } else if (g.deadline && g.deadline <= goalHorizon) {
      const pct = target > 0 ? Math.round((current / target) * 100) : 0
      const overdue = g.deadline < today
      notifications.push({
        id: `goal_deadline:${g.id}:${g.deadline}:${overdue ? 'overdue' : 'soon'}`,
        type: 'goal_deadline',
        severity: overdue ? 'alert' : 'warning',
        title: overdue ? t('goalOverdue', { label }) : t('goalSoon', { label }),
        detail: t('goalFunded', { percent: pct, overdue: overdue ? 'yes' : 'no', date: shortDate(g.deadline, locale) }),
        href: '/saving-goals',
      })
    }
  }

  // Credit cards: high utilization (≥80% of limit)
  for (const w of creditWallets ?? []) {
    const limit = Number(w.credit_limit ?? 0)
    if (limit <= 0) continue
    const used = Math.max(0, limit - Number(w.balance))
    const pct = used / limit
    if (pct >= 0.8) {
      notifications.push({
        id: `credit:${w.id}`, type: 'credit_high', severity: 'warning',
        title: t('creditHigh', { wallet: w.name }),
        detail: t('creditUsage', { percent: Math.round(pct * 100), used: formatVND(used), limit: formatVND(limit) }),
        href: '/wallets',
      })
    }
  }

  // Drop state rows whose condition no longer holds — keeps the table
  // small and re-arms dismissed notifications if the condition returns
  const currentIds = new Set(notifications.map(n => n.id))
  const staleIds = (stateRows ?? [])
    .map(s => s.notification_id)
    .filter(id => !currentIds.has(id))
  if (staleIds.length > 0) {
    await supabase.from('notification_states')
      .delete()
      .eq('user_id', user.id)
      .in('notification_id', staleIds)
  }

  const stateById = new Map((stateRows ?? []).map(s => [s.notification_id, s]))
  const visible: AppNotification[] = notifications
    .filter(n => !stateById.get(n.id)?.dismissed_at)
    .map(n => ({ ...n, read: Boolean(stateById.get(n.id)?.read_at) }))

  visible.sort((a, b) =>
    Number(a.read) - Number(b.read) ||
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  return NextResponse.json(visible)
})

// Mark notifications read or dismissed: { action: 'read' | 'dismiss', ids: string[] }
export const PATCH = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const action = body?.action
  const ids = body?.ids

  if (action !== 'read' && action !== 'dismiss') {
    return badRequest('actionMustBeReadOrDismiss')
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100
    || !ids.every(id => typeof id === 'string' && id.length <= 200)) {
    return badRequest('idsMustBeANonEmptyArrayOfStrings')
  }

  const now = new Date().toISOString()
  const column = action === 'read' ? 'read_at' : 'dismissed_at'
  const rows = ids.map(id => ({
    user_id: user.id,
    notification_id: id,
    [column]: now,
  }))

  // Upsert only touches the column present in the payload, so marking
  // read never clears an existing dismissed_at and vice versa
  const { error } = await supabase.from('notification_states')
    .upsert(rows, { onConflict: 'user_id,notification_id' })
  if (error) {
    console.error('[api] notification state upsert failed:', error.message)
    return supabaseError(error)
  }

  return noContent()
})
