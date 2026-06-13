import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const monthParam = request.nextUrl.searchParams.get('month')
  const now = new Date()
  const month = monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [year, monthNum] = month.split('-').map(Number)
  const startDate = `${month}-01`
  const endDate = new Date(year, monthNum, 1).toISOString().slice(0, 10)

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

  // Group expense by category
  const catMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null; amount: number }>()
  for (const row of expenseCatRows ?? []) {
    const cat = row.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    if (!cat) continue
    const prev = catMap.get(cat.id)
    catMap.set(cat.id, { ...cat, amount: (prev?.amount ?? 0) + Number(row.amount) })
  }
  const expenseByCategory = [...catMap.values()].sort((a, b) => b.amount - a.amount)

  // Budgets with spent
  const budgets = (budgetRows ?? []).map(b => {
    const cat = b.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    return {
      id: b.id,
      amount: Number(b.amount),
      spent: cat ? (catMap.get(cat.id)?.amount ?? 0) : 0,
      category: cat,
    }
  })

  return NextResponse.json({
    month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    recentTransactions: recentRows ?? [],
    expenseByCategory,
    budgets,
  })
}
