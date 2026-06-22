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

  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .eq('user_id', user.id)
    .gte('transaction_date', startDate)
    .lt('transaction_date', endDate)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, amount, category_id, wallet_id, transaction_date, note } = body

  if (!type || !amount || !transaction_date) {
    return NextResponse.json({ error: 'Type, amount and date are required.' }, { status: 400 })
  }
  if (type !== 'income' && type !== 'expense') {
    return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type,
      amount: Number(amount),
      category_id: category_id || null,
      wallet_id: wallet_id || null,
      transaction_date,
      note: note?.trim() || null,
    })
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (wallet_id) {
    const delta = type === 'income' ? Number(amount) : -Number(amount)
    const { error: balErr } = await supabase.rpc('adjust_wallet_balance', {
      p_wallet_id: wallet_id,
      p_delta: delta,
      p_user_id: user.id,
    })
    if (balErr) return NextResponse.json({ error: balErr.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
