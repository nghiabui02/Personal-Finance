import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*, categories(id, name, icon, color), wallets(id, name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, amount, category_id, wallet_id, note, frequency, start_date, end_date } = body

  if (!type || !amount || !frequency || !start_date) {
    return NextResponse.json({ error: 'Type, amount, frequency and start date are required.' }, { status: 400 })
  }
  if (!['income', 'expense'].includes(type)) return NextResponse.json({ error: 'Invalid type.' }, { status: 400 })
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(frequency)) {
    return NextResponse.json({ error: 'Invalid frequency.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: user.id,
      type,
      amount: Number(amount),
      category_id: category_id || null,
      wallet_id: wallet_id || null,
      note: note?.trim() || null,
      frequency,
      start_date,
      end_date: end_date || null,
      next_run_date: start_date,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
