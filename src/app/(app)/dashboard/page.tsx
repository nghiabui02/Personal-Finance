import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { processRecurring } from '@/lib/server/process-recurring'

export const metadata: Metadata = { title: 'Dashboard' }
import { BudgetProgress } from './_components/budget-progress'
import { DebtSummary } from './_components/debt-summary'
import { MonthSelector } from './_components/month-selector'
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

  const [year, monthNum] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = new Date(year, monthNum, 1).toISOString().slice(0, 10)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Silently process any due recurring transactions on dashboard load
  await processRecurring(supabase, user.id)

  const [
    { data: incomeRows },
    { data: recentRows },
    { data: expenseCatRows },
    { data: budgetRows },
    { data: debtRows },
  ] = await Promise.all([
    supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('transaction_date', startDate).lt('transaction_date', endDate),
    supabase.from('transactions').select('id, type, amount, note, transaction_date, categories(id, name, icon, color)').eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(6),
    supabase.from('transactions').select('amount, categories(id, name, icon, color)').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', startDate).lt('transaction_date', endDate),
    supabase.from('budgets').select('id, amount, categories(id, name, icon, color)').eq('user_id', user.id).eq('month', startDate),
    supabase.from('debts').select('type, remaining_amount, status').eq('user_id', user.id),
  ])

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

  return (
    <div className="space-y-4">
      <MonthSelector month={month} />

      <StatCards
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={totalIncome - totalExpense}
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
    </div>
  )
}
