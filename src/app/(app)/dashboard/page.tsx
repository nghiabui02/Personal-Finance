import { createClient } from '@/lib/supabase/server'
import { BudgetProgress } from './_components/budget-progress'
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

  const [
    { data: incomeRows },
    { data: expenseRows },
    { data: recentRows },
    { data: expenseCatRows },
    { data: budgetRows },
  ] = await Promise.all([
    supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('transaction_date', startDate).lt('transaction_date', endDate),
    supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', startDate).lt('transaction_date', endDate),
    supabase.from('transactions').select('id, type, amount, note, transaction_date, categories(id, name, icon, color)').eq('user_id', user.id).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(8),
    supabase.from('transactions').select('amount, categories(id, name, icon, color)').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', startDate).lt('transaction_date', endDate),
    supabase.from('budgets').select('id, amount, categories(id, name, icon, color)').eq('user_id', user.id).eq('month', startDate),
  ])

  const totalIncome = (incomeRows ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const totalExpense = (expenseRows ?? []).reduce((s, r) => s + Number(r.amount), 0)

  const catMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null; amount: number }>()
  for (const row of expenseCatRows ?? []) {
    const cat = row.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    if (!cat) continue
    const prev = catMap.get(cat.id)
    catMap.set(cat.id, { ...cat, amount: (prev?.amount ?? 0) + Number(row.amount) })
  }
  const expenseByCategory = [...catMap.values()].sort((a, b) => b.amount - a.amount)

  const budgets = (budgetRows ?? []).map(b => {
    const cat = b.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    return { id: b.id, amount: Number(b.amount), spent: cat ? (catMap.get(cat.id)?.amount ?? 0) : 0, category: cat }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Overview of your finances</p>
        </div>
        <MonthSelector month={month} />
      </div>

      <StatCards
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={totalIncome - totalExpense}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2">
          <SpendingChart data={expenseByCategory} totalExpense={totalExpense} />
        </div>
        <div className="lg:col-span-3">
          <RecentTransactions transactions={(recentRows ?? []) as unknown as Parameters<typeof RecentTransactions>[0]['transactions']} />
        </div>
      </div>

      <BudgetProgress budgets={budgets} />
    </div>
  )
}
