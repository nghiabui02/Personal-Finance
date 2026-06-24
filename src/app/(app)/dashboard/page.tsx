import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { processRecurring } from '@/lib/server/process-recurring'
import { formatVND } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Dashboard' }
import { AlertsBanner, type Alert } from './_components/alerts-banner'
import { BudgetProgress } from './_components/budget-progress'
import { DebtSummary } from './_components/debt-summary'
import { MonthSelector } from './_components/month-selector'
import { NetWorthChart } from './_components/net-worth-chart'
import { RecentTransactions } from './_components/recent-transactions'
import { SpendingChart } from './_components/spending-chart'
import { StatCards } from './_components/stat-cards'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const now = new Date()
  const month = monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const todayStr = now.toISOString().slice(0, 10)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [year, monthNum] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = new Date(year, monthNum, 1).toISOString().slice(0, 10)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  await processRecurring(supabase, user.id)

  const [
    { data: incomeRows },
    { data: recentRows },
    { data: expenseCatRows },
    { data: budgetRows },
    { data: debtRows },
    { data: walletRows },
    { data: snapshotRows },
  ] = await Promise.all([
    supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('transaction_date', startDate).lt('transaction_date', endDate),
    supabase.from('transactions').select('id, type, amount, note, transaction_date, categories(id, name, icon, color)').eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(6),
    supabase.from('transactions').select('amount, categories(id, name, icon, color)').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', startDate).lt('transaction_date', endDate),
    supabase.from('budgets').select('id, amount, categories(id, name, icon, color)').eq('user_id', user.id).eq('month', startDate),
    supabase.from('debts').select('id, type, remaining_amount, status, due_date, person_name').eq('user_id', user.id),
    supabase.from('wallets').select('type, balance, credit_limit').eq('user_id', user.id),
    supabase.from('net_worth_snapshots').select('recorded_date, net_worth').eq('user_id', user.id).gte('recorded_date', ninetyDaysAgo).order('recorded_date', { ascending: true }),
  ])

  // Net worth
  let totalAssets = 0
  let totalCreditDebt = 0
  for (const w of walletRows ?? []) {
    if (w.type === 'credit') {
      totalCreditDebt += Math.max(0, Number(w.credit_limit ?? 0) - Number(w.balance))
    } else {
      totalAssets += Number(w.balance)
    }
  }
  const netWorth = totalAssets - totalCreditDebt

  // Upsert today's net worth snapshot (fire-and-forget, don't block render)
  supabase.from('net_worth_snapshots').upsert(
    { user_id: user.id, net_worth: netWorth, recorded_date: todayStr },
    { onConflict: 'user_id,recorded_date' }
  ).then(() => {})

  const totalIncome = (incomeRows ?? []).reduce((s, r) => s + Number(r.amount), 0)

  let totalExpense = 0
  const catMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null; amount: number }>()
  for (const row of expenseCatRows ?? []) {
    const rowAmount = Number(row.amount)
    totalExpense += rowAmount
    const cat = row.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    if (!cat) continue
    const prev = catMap.get(cat.id)
    catMap.set(cat.id, { ...cat, amount: (prev?.amount ?? 0) + rowAmount })
  }
  const expenseByCategory = [...catMap.values()].sort((a, b) => b.amount - a.amount)

  const budgets = (budgetRows ?? []).map(b => {
    const cat = b.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    return { id: b.id, amount: Number(b.amount), spent: cat ? (catMap.get(cat.id)?.amount ?? 0) : 0, category: cat }
  })

  // Compute alerts
  const alerts: Alert[] = []

  for (const b of budgets) {
    if (!b.category) continue
    const pct = b.amount > 0 ? b.spent / b.amount : 0
    if (b.spent > b.amount) {
      alerts.push({
        type: 'budget_over',
        label: `Budget vượt ngưỡng: ${b.category.icon ?? ''} ${b.category.name} — chi ${formatVND(b.spent)} / ngân sách ${formatVND(b.amount)}`,
        href: '/budgets',
      })
    } else if (pct >= 0.8) {
      alerts.push({
        type: 'budget_near',
        label: `Gần hết ngân sách: ${b.category.icon ?? ''} ${b.category.name} — đã dùng ${Math.round(pct * 100)}%`,
        href: '/budgets',
      })
    }
  }

  for (const d of debtRows ?? []) {
    if (d.status !== 'active' || Number(d.remaining_amount) <= 0 || !d.due_date) continue
    if (d.due_date <= sevenDaysLater) {
      const isOverdue = d.due_date < todayStr
      const label = isOverdue
        ? `Quá hạn: nợ với ${d.person_name} — ${formatVND(d.remaining_amount)} còn lại`
        : `Sắp đến hạn: nợ với ${d.person_name} vào ${d.due_date} — ${formatVND(d.remaining_amount)} còn lại`
      alerts.push({ type: 'debt_due', label, href: '/debts' })
    }
  }

  return (
    <div className="space-y-4">
      <MonthSelector month={month} />

      <AlertsBanner alerts={alerts.slice(0, 5)} />

      <StatCards
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={totalIncome - totalExpense}
        netWorth={netWorth}
        totalAssets={totalAssets}
        totalCreditDebt={totalCreditDebt}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <SpendingChart data={expenseByCategory} totalExpense={totalExpense} />
        </div>
        <div className="lg:col-span-3 flex flex-col">
          <RecentTransactions transactions={(recentRows ?? []) as unknown as Parameters<typeof RecentTransactions>[0]['transactions']} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <BudgetProgress budgets={budgets} />
        <DebtSummary debts={(debtRows ?? []) as { type: 'lend' | 'borrow'; remaining_amount: number; status: string }[]} />
      </div>

      <NetWorthChart snapshots={(snapshotRows ?? []) as { recorded_date: string; net_worth: number }[]} />
    </div>
  )
}
