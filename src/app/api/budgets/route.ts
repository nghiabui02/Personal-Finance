import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const monthParam = request.nextUrl.searchParams.get('month')
  const now = new Date()
  const month = monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const startDate = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const endDate = new Date(y, m, 1).toISOString().slice(0, 10)

  const [{ data: budgets }, { data: expenses }] = await Promise.all([
    supabase
      .from('budgets')
      .select('*, categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('month', startDate)
      .order('created_at'),
    supabase
      .from('transactions')
      .select('category_id, amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate),
  ])

  // Calculate spent per category
  const spent: Record<string, number> = {}
  for (const tx of expenses ?? []) {
    if (!tx.category_id) continue
    spent[tx.category_id] = (spent[tx.category_id] ?? 0) + Number(tx.amount)
  }

  const result = (budgets ?? []).map(b => ({
    ...b,
    spent: spent[b.category_id ?? ''] ?? 0,
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { category_id, amount, month } = body

  if (!amount || Number(amount) <= 0) return NextResponse.json({ error: 'Amount is required.' }, { status: 400 })
  if (!month) return NextResponse.json({ error: 'Month is required.' }, { status: 400 })

  const { data, error } = await supabase
    .from('budgets')
    .insert({ user_id: user.id, category_id: category_id || null, amount: Number(amount), month })
    .select('*, categories(id, name, icon, color)')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A budget for this category already exists in this month.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
