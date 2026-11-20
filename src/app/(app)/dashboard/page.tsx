import { LoadingContent } from '@/components/ui/navigation-loading'
import { CATEGORY_RELATION } from '@/lib/category-columns'
import { getCategoryName } from '@/i18n/category'
import { getLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/server/auth'
import { getNetWorthSnapshot } from '@/lib/server/net-worth'
import { getBudgetsForMonth } from '@/lib/server/budget-rollover'
import { getSpendingPace } from '@/lib/server/spending-pace'
import { getReportTotals, summarizeOperatingTotals } from '@/lib/server/transaction-reporting'
import { formatVND } from '@/lib/utils/currency'
import { localYM, localYMD, monthRange, shiftLocalDate } from '@/lib/utils/date'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('navigation')
  return { title: t('dashboard') }
}
import { DashboardHero, type Alert } from './_components/dashboard-hero'
import { BudgetProgress } from './_components/budget-progress'
import { DebtSummary } from './_components/debt-summary'
import { NetWorthChart } from './_components/net-worth-chart'
import { RecentTransactions } from './_components/recent-transactions'
import { SpendingChart } from './_components/spending-chart'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const t = await getTranslations('dashboard')
  const locale = await getLocale()
  const { month: monthParam } = await searchParams
  const month = monthParam ?? localYM()
  const todayStr = localYMD()
  const ninetyDaysAgo = shiftLocalDate(todayStr, -90)
  const sevenDaysLater = shiftLocalDate(todayStr, 7)
  const { startDate, endDate } = monthRange(month)

  const { supabase, user } = await requireUser()

  const [
    totals,
    { data: recentRows },
    balanceSheet,
    { data: snapshotRows },
    budgetsWithRollover,
  ] = await Promise.all([
    getReportTotals(supabase, startDate, endDate, true),
    supabase.from('transactions').select(`id, type, amount, note, transaction_date, ${CATEGORY_RELATION}`).eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(6),
    getNetWorthSnapshot(supabase, user.id),
    supabase.from('net_worth_snapshots').select('recorded_date, net_worth').eq('user_id', user.id).gte('recorded_date', ninetyDaysAgo).order('recorded_date', { ascending: true }),
    getBudgetsForMonth(supabase, user.id, month).then(rows => rows.filter(b => b.active)),
  ])

  const { netWorth, totalWalletBalance, totalLent, totalCreditDebt, totalBorrowed } =
    balanceSheet

  const { totalIncome, totalExpense, categories } = summarizeOperatingTotals(totals)
  const expenseByCategory = categories.filter(category => category.id)

  const budgets = budgetsWithRollover.map(b => ({
    id: b.id, amount: b.effectiveAmount, spent: b.spent, category: b.categories,
  }))

  // The opening sentence needs a comparison, so it waits on the month's own total
  const pace = await getSpendingPace(supabase, month, totalExpense)
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
        label: t('budgetOverAlert', { category: `${b.category.icon ?? ''} ${getCategoryName(b.category, locale)}`, spent: formatVND(b.spent), amount: formatVND(b.amount) }),
        href: '/budgets',
      })
    } else if (pct >= 0.8) {
      alerts.push({
        type: 'budget_near',
        label: t('budgetNearAlert', { category: `${b.category.icon ?? ''} ${getCategoryName(b.category, locale)}`, percent: Math.round(pct * 100) }),
        href: '/budgets',
      })
    }
  }
  for (const d of balanceSheet.debts) {
    if (d.status !== 'active' || Number(d.remaining_amount) <= 0 || !d.due_date) continue
    if (d.due_date <= sevenDaysLater) {
      const isOverdue = d.due_date < todayStr
      // lend = they owe you; borrow = you owe them
      const direction = d.type === 'lend'
        ? t('owedBy', { person: d.person_name })
        : t('owedTo', { person: d.person_name })
      alerts.push({
        type: 'debt_due',
        label: isOverdue
          ? t('debtOverdue', { direction, amount: formatVND(d.remaining_amount) })
          : t('debtSoon', { direction, amount: formatVND(d.remaining_amount), date: d.due_date }),
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

      <LoadingContent>
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
          <DebtSummary debts={balanceSheet.debts as { type: 'lend' | 'borrow'; remaining_amount: number; status: string }[]} />
        </div>

        <NetWorthChart snapshots={(snapshotRows ?? []) as { recorded_date: string; net_worth: number }[]} />
      </LoadingContent>

    </div>
  )
}
