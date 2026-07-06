import { NextResponse } from 'next/server'
import { withAuth, badRequest, conflict, supabaseError } from '@/lib/server/route'
import { localYM, monthRange } from '@/lib/utils/date'

export const GET = withAuth(async (request, { supabase, user }) => {
  const month = request.nextUrl.searchParams.get('month') ?? localYM()
  const { startDate, endDate } = monthRange(month)

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
})

export const POST = withAuth(async (request, { supabase, user }) => {
  const body = await request.json()
  const { category_id, amount, month } = body

  if (!amount || Number(amount) <= 0) return badRequest('Amount is required.')
  if (!month) return badRequest('Month is required.')

  const { data, error } = await supabase
    .from('budgets')
    .insert({ user_id: user.id, category_id: category_id || null, amount: Number(amount), month })
    .select('*, categories(id, name, icon, color)')
    .single()

  if (error) {
    if (error.code === '23505') return conflict('A budget for this category already exists in this month.')
    return supabaseError(error)
  }

  return NextResponse.json(data, { status: 201 })
})
