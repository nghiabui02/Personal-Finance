import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = parseInt(request.nextUrl.searchParams.get('year') ?? String(new Date().getFullYear()))
  const startDate = `${year}-01-01`
  const endDate = `${year + 1}-01-01`

  const [{ data: transactions }, { data: expenseRows }] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate),
    supabase
      .from('transactions')
      .select('amount, categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate),
  ])

  // Monthly aggregation — all 12 months pre-filled with 0
  const monthly: Record<string, { income: number; expense: number }> = {}
  for (let m = 1; m <= 12; m++) {
    monthly[`${year}-${String(m).padStart(2, '0')}`] = { income: 0, expense: 0 }
  }
  for (const tx of transactions ?? []) {
    const month = tx.transaction_date.slice(0, 7)
    if (monthly[month]) {
      monthly[month][tx.type as 'income' | 'expense'] += Number(tx.amount)
    }
  }

  // Category aggregation
  const catMap = new Map<string, { id: string; name: string; icon: string | null; color: string | null; amount: number }>()
  for (const row of expenseRows ?? []) {
    const cat = row.categories as unknown as { id: string; name: string; icon: string | null; color: string | null } | null
    if (!cat) continue
    const prev = catMap.get(cat.id)
    catMap.set(cat.id, { ...cat, amount: (prev?.amount ?? 0) + Number(row.amount) })
  }

  const totalIncome = (transactions ?? []).filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = (transactions ?? []).filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return NextResponse.json({
    year,
    monthly: Object.entries(monthly).map(([month, data]) => ({ month, ...data })),
    byCategory: [...catMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 8),
    totalIncome,
    totalExpense,
  })
}
