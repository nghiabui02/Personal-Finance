import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { computeNetWorth, recordNetWorthSnapshot } from '@/lib/server/net-worth'
import { getBudgetsForMonth } from '@/lib/server/budget-rollover'
import { getSpendingPace } from '@/lib/server/spending-pace'
import type { CategoryRef } from '@/lib/types'
import { formatVND } from '@/lib/utils/currency'
import { localYM, localYMD, monthRange, shiftLocalDate } from '@/lib/utils/date'

export const metadata: Metadata = { title: 'Dashboard' }
import { DashboardHero, type Alert } from './_components/dashboard-hero'
import { BudgetProgress } from './_components/budget-progress'
import { DebtSummary } from './_components/debt-summary'
import { NetWorthChart } from './_components/net-worth-chart'
import { RecentTransactions } from './_components/recent-transactions'
import { SpendingChart } from './_components/spending-chart'
import { WALLET_COLUMNS } from '@/lib/api/wallets'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = monthParam ?? localYM()
  const todayStr = localYMD()
  const ninetyDaysAgo = shiftLocalDate(todayStr, -90)
  const sevenDaysLater = shiftLocalDate(todayStr, 7)
  const { startDate, endDate } = monthRange(month)

  const { supabase, user } = await requireUser()

  const [
    [
      { data: incomeRows },
      { data: recentRows },
      { data: expenseCatRows },
      { data: debtRows },
      { data: walletRows },
      { data: snapshotRows },
    ],
    budgetsWithRollover,
  ] = await Promise.all([
    Promise.all([
      // Income/expense totals exclude transfer legs (money moved between own
      // wallets) — see getPeriodSummary(). The recent-transactions list keeps
      // them, since the user does want to see transfers in their history.
      supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').is('transfer_pair_id', null).gte('transaction_date', startDate).lt('transaction_date', endDate),
      supabase.from('transactions').select('id, type, amount, note, transaction_date, categories(id, name, icon, color)').eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(6),
      supabase.from('transactions').select('amount, categories(id, name, icon, color)').eq('user_id', user.id).eq('type', 'expense').is('transfer_pair_id', null).gte('transaction_date', startDate).lt('transaction_date', endDate),
      supabase.from('debts').select('id, type, remaining_amount, status, due_date, person_name').eq('user_id', user.id),
      supabase.from('wallets').select(WALLET_COLUMNS).eq('user_id', user.id).order('is_default', { ascending: false }).order('name'),
      supabase.from('net_worth_snapshots').select('recorded_date, net_worth').eq('user_id', user.id).gte('recorded_date', ninetyDaysAgo).order('recorded_date', { ascending: true }),
    ]),
    getBudgetsForMonth(supabase, user.id, month).then(rows => rows.filter(b => b.active)),
  ])

  const { netWorth, totalWalletBalance, totalLent, totalCreditDebt, totalBorrowed } =
    computeNetWorth(walletRows ?? [], debtRows ?? [])
  await recordNetWorthSnapshot(supabase, user.id, netWorth)

  const totalIncome = (incomeRows ?? []).reduce((s, r) => s + Number(r.amount), 0)

  let totalExpense = 0
  const catMap = new Map<string, CategoryRef & { amount: number }>()
  for (const row of expenseCatRows ?? []) {
    const rowAmount = Number(row.amount)
    totalExpense += rowAmount
    const cat = row.categories as unknown as CategoryRef | null
    if (!cat) continue
    const prev = catMap.get(cat.id)
    catMap.set(cat.id, { ...cat, amount: (prev?.amount ?? 0) + rowAmount })
  }
  const expenseByCategory = [...catMap.values()].sort((a, b) => b.amount - a.amount)

  const budgets = budgetsWithRollover.map(b => ({
    id: b.id, amount: b.effectiveAmount, spent: b.spent, category: b.categories,
  }))

  // The opening sentence needs a comparison, so it waits on the month's own total
  const pace = await getSpendingPace(supabase, user.id, month, totalExpense)
  const budgetHeadroom = budgets.length > 0
    ? budgets.reduce((s, b) => s + (b.amount - b.spent), 0)
    : null

  // Alerts
  const alerts: Alert[] = []
  for (const b of budgets) {
    if (!b.category) continue
    const pct = b.amount > 0 ? b.spent / b.amount : 0
    if (b.spent > b.amount) {
      alerts.push({
        type: 'budget_over',
        label: `Over budget: ${b.category.icon ?? ''} ${b.category.name} — spent ${formatVND(b.spent)} of ${formatVND(b.amount)}`,
        href: '/budgets',
      })
    } else if (pct >= 0.8) {
      alerts.push({
        type: 'budget_near',
        label: `Budget nearly full: ${b.category.icon ?? ''} ${b.category.name} — ${Math.round(pct * 100)}% used`,
        href: '/budgets',
      })
    }
  }
  for (const d of debtRows ?? []) {
    if (d.status !== 'active' || Number(d.remaining_amount) <= 0 || !d.due_date) continue
    if (d.due_date <= sevenDaysLater) {
      const isOverdue = d.due_date < todayStr
      // lend = they owe you; borrow = you owe them
      const direction = d.type === 'lend'
        ? `${d.person_name} owes you`
        : `You owe ${d.person_name}`
      alerts.push({
        type: 'debt_due',
        label: isOverdue
          ? `Overdue: ${direction} — ${formatVND(d.remaining_amount)} remaining`
          : `Due soon: ${direction} — ${formatVND(d.remaining_amount)} on ${d.due_date}`,
        href: '/debts',
      })
    }
  }


  return (
    <div className="space-y-4 pb-2">
      <DashboardHero
        month={month}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        netWorth={netWorth}
        totalWalletBalance={totalWalletBalance}
        totalLent={totalLent}
        totalCreditDebt={totalCreditDebt}
        totalBorrowed={totalBorrowed}
        alerts={alerts.slice(0, 5)}
        pace={pace}
        budgetHeadroom={budgetHeadroom}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <SpendingChart data={expenseByCategory} totalExpense={totalExpense} />
        </div>
        <div className="lg:col-span-3 flex flex-col">
          <RecentTransactions transactions={(recentRows ?? []) as unknown as Parameters<typeof RecentTransactions>[0]['transactions']} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BudgetProgress budgets={budgets} />
        <DebtSummary debts={(debtRows ?? []) as { type: 'lend' | 'borrow'; remaining_amount: number; status: string }[]} />
      </div>

      <NetWorthChart snapshots={(snapshotRows ?? []) as { recorded_date: string; net_worth: number }[]} />

    </div>
  )
}
