import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, type, balance, icon, color, is_default, credit_limit, statement_day, payment_due_day } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!['cash', 'bank', 'e_wallet', 'investment', 'other', 'credit'].includes(type)) {
    return NextResponse.json({ error: 'Invalid wallet type.' }, { status: 400 })
  }

  if (is_default) {
    await supabase.from('wallets').update({ is_default: false }).eq('user_id', user.id)
  }

  const isCredit = type === 'credit'
  const creditLimit = isCredit ? Number(credit_limit) || 0 : null

  const { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: user.id,
      name: name.trim(),
      type,
      balance: isCredit ? creditLimit : (Number(balance) || 0),
      icon: icon?.trim() || null,
      color: color || null,
      is_default: is_default ?? false,
      credit_limit: creditLimit,
      statement_day: isCredit ? (Number(statement_day) || null) : null,
      payment_due_day: isCredit ? (Number(payment_due_day) || null) : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
