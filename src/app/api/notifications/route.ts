import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/server/route'
import { formatVND } from '@/lib/utils/currency'
import { localYM, localYMD, monthRange, shiftLocalDate } from '@/lib/utils/date'

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
}

const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  alert: 0, warning: 1, info: 2, success: 3,
}

type CategoryRef = { name: string; icon: string | null } | null

function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const GET = withAuth(async (_request, { supabase, user }) => {
  const today = localYMD()
  const { startDate, endDate } = monthRange(localYM())
  const debtHorizon = shiftLocalDate(today, 7)
  const recurringHorizon = shiftLocalDate(today, 3)
  const goalHorizon = shiftLocalDate(today, 14)

  const [
    { data: budgetRows },
    { data: expenseRows },
    { data: debtRows },
    { data: recurringRows },
    { data: goalRows },
    { data: creditWallets },
  ] = await Promise.all([
    supabase.from('budgets')
      .select('id, amount, category_id, categories(name, icon)')
      .eq('user_id', user.id).eq('month', startDate),
    supabase.from('transactions')
      .select('category_id, amount')
      .eq('user_id', user.id).eq('type', 'expense')
      .gte('transaction_date', startDate).lt('transaction_date', endDate),
    supabase.from('debts')
      .select('id, type, person_name, remaining_amount, due_date')
      .eq('user_id', user.id).eq('status', 'active'),
    supabase.from('recurring_transactions')
      .select('id, type, amount, note, frequency, next_run_date, end_date, categories(name, icon)')
      .eq('user_id', user.id)
      .not('next_run_date', 'is', null)
      .lte('next_run_date', recurringHorizon),
    supabase.from('saving_goals')
      .select('id, name, icon, target_amount, current_amount, deadline')
      .eq('user_id', user.id).eq('status', 'active'),
    supabase.from('wallets')
      .select('id, name, balance, credit_limit')
      .eq('user_id', user.id).eq('type', 'credit'),
  ])

  const notifications: AppNotification[] = []

  // Budgets: over / nearly full (this month)
  const spentByCategory: Record<string, number> = {}
  for (const tx of expenseRows ?? []) {
    if (!tx.category_id) continue
    spentByCategory[tx.category_id] = (spentByCategory[tx.category_id] ?? 0) + Number(tx.amount)
  }
  for (const b of budgetRows ?? []) {
    const cat = b.categories as unknown as CategoryRef
    if (!cat || !b.category_id) continue
    const amount = Number(b.amount)
    const spent = spentByCategory[b.category_id] ?? 0
    const pct = amount > 0 ? spent / amount : 0
    const label = `${cat.icon ?? ''} ${cat.name}`.trim()
    if (spent > amount) {
      notifications.push({
        id: `budget_over:${b.id}`, type: 'budget_over', severity: 'alert',
        title: `Over budget: ${label}`,
        detail: `Spent ${formatVND(spent)} of ${formatVND(amount)}`,
        href: '/budgets',
      })
    } else if (pct >= 0.8) {
      notifications.push({
        id: `budget_near:${b.id}`, type: 'budget_near', severity: 'warning',
        title: `Budget nearly full: ${label}`,
        detail: `${Math.round(pct * 100)}% used — ${formatVND(amount - spent)} left`,
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
      ? `${d.person_name} owes you`
      : `You owe ${d.person_name}`
    notifications.push({
      id: `debt:${d.id}`,
      type: isOverdue ? 'debt_overdue' : 'debt_due',
      severity: isOverdue ? 'alert' : 'warning',
      title: isOverdue ? `Overdue debt: ${direction}` : `Debt due soon: ${direction}`,
      detail: `${formatVND(remaining)} remaining · due ${shortDate(d.due_date)}`,
      href: '/debts',
    })
  }

  // Recurring transactions running within 3 days
  for (const r of recurringRows ?? []) {
    if (!r.next_run_date) continue
    if (r.end_date && r.end_date < r.next_run_date) continue
    const cat = r.categories as unknown as CategoryRef
    const label = r.note || cat?.name || (r.type === 'income' ? 'Income' : 'Expense')
    notifications.push({
      id: `recurring:${r.id}`, type: 'recurring_upcoming', severity: 'info',
      title: `Upcoming recurring: ${label}`,
      detail: `${r.type === 'income' ? '+' : '−'}${formatVND(Number(r.amount))} on ${shortDate(r.next_run_date)}`,
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
        title: `Goal reached: ${label}`,
        detail: `${formatVND(current)} saved — mark it as completed 🎉`,
        href: '/saving-goals',
      })
    } else if (g.deadline && g.deadline <= goalHorizon) {
      const pct = target > 0 ? Math.round((current / target) * 100) : 0
      const overdue = g.deadline < today
      notifications.push({
        id: `goal_deadline:${g.id}`, type: 'goal_deadline',
        severity: overdue ? 'alert' : 'warning',
        title: overdue ? `Goal past deadline: ${label}` : `Goal deadline soon: ${label}`,
        detail: `${pct}% funded · ${overdue ? 'was due' : 'due'} ${shortDate(g.deadline)}`,
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
        title: `Credit card nearly maxed: ${w.name}`,
        detail: `${Math.round(pct * 100)}% of limit used — ${formatVND(used)} of ${formatVND(limit)}`,
        href: '/wallets',
      })
    }
  }

  notifications.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  return NextResponse.json(notifications)
})
